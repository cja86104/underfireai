/**
 * UnderFireAI - Resume Insights Service
 *
 * Orchestrates resume analysis operations and handles database persistence.
 */

import { createClient } from '@/lib/supabase/server';
import {
  analyzeResumeAlignment,
  type AlignmentAnalysis,
} from './alignment-analyzer';
import {
  scanResumeVulnerabilities,
  type VulnerabilityScan,
} from './vulnerability-scanner';
import {
  generateResumeSuggestions,
  type SuggestionBatch,
  type ResumeSuggestion,
} from './suggestion-generator';
import type { ResponseAnalysis, Json } from '@/types/database';

// ===========================================
// TYPES
// ===========================================

export interface ResumeInsight {
  id: string;
  userId: string;
  resumeId: string;
  sessionId: string | null;
  insightType: 'alignment' | 'vulnerability' | 'suggestion' | 'gap_analysis';
  alignmentScore: number | null;
  discrepancies: AlignmentAnalysis['discrepancies'];
  confirmations: AlignmentAnalysis['confirmations'];
  vulnerabilities: VulnerabilityScan['vulnerabilities'];
  vulnerabilityScore: number | null;
  resumeSuggestions: ResumeSuggestion[];
  createdAt: string;
}

interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  analysis?: ResponseAnalysis | null;
}

interface SessionScores {
  overall_score: number;
  clarity_score: number;
  confidence_score: number;
  technical_depth: number;
  star_usage_score: number;
  communication_score: number;
}

interface ResumeData {
  id: string;
  rawText: string;
  skills: string[];
  targetRole: string | null;
  experienceYears: number | null;
}

// ===========================================
// SERVICE FUNCTIONS
// ===========================================

/**
 * Get user's active (most recent) resume
 */
export async function getActiveResume(
  userId: string
): Promise<ResumeData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_resumes')
    .select('id, raw_text, skills, target_role, experience_years')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    rawText: data.raw_text ?? '',
    skills: data.skills ?? [],
    targetRole: data.target_role,
    experienceYears: data.experience_years,
  };
}

/**
 * Generate and save alignment analysis for a completed interview
 */
export async function generateAndSaveAlignmentAnalysis(
  userId: string,
  sessionId: string,
  messages: InterviewMessage[],
  scores: SessionScores,
  interviewType: string,
  targetRole?: string | null
): Promise<ResumeInsight | null> {
  const resume = await getActiveResume(userId);
  if (!resume?.rawText) {
    return null;
  }

  // Run alignment analysis
  const alignment = await analyzeResumeAlignment(
    resume.rawText,
    resume.skills,
    messages,
    scores,
    interviewType,
    targetRole
  );

  // Save to database
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('resume_insights')
    .insert({
      user_id: userId,
      resume_id: resume.id,
      session_id: sessionId,
      insight_type: 'alignment',
      alignment_score: alignment.alignmentScore,
      discrepancies: alignment.discrepancies as unknown as Json,
      confirmations: alignment.confirmations as unknown as Json,
      resume_suggestions: alignment.suggestions as unknown as Json,
      vulnerabilities: [],
      vulnerability_score: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving alignment analysis:', error);
    return null;
  }

  // Update session_scores to link the insight
  await supabase
    .from('session_scores')
    .update({
      resume_alignment_generated: true,
      resume_insight_id: data.id,
    })
    .eq('session_id', sessionId);

  return mapInsightFromDb(data);
}

/**
 * Generate and save vulnerability scan for a resume
 *
 * @param fileHash - Optional SHA-256 hash of the raw uploaded file bytes
 *   (see app/api/resume/upload/route.ts). When provided, this is an
 *   opt-in dedupe path: if another of the user's resumes with the same
 *   hash already has a vulnerability scan from the last 24 hours, that
 *   result is copied for the new resume_id instead of calling the Mistral
 *   API again. This only applies to the auto-triggered scan-on-upload
 *   flow — callers that omit fileHash (e.g. the manual
 *   /api/resume/scan-vulnerabilities endpoint, including its `forceRescan`
 *   path) always run a fresh scan, unchanged from prior behaviour.
 */
export async function generateAndSaveVulnerabilityScan(
  userId: string,
  resumeId?: string,
  fileHash?: string
): Promise<ResumeInsight | null> {
  const supabase = await createClient();

  // Get resume
  let resume: ResumeData | null;
  if (resumeId) {
    const { data, error } = await supabase
      .from('user_resumes')
      .select('id, raw_text, skills, target_role, experience_years')
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Resume not found:', error);
      return null;
    }

    resume = {
      id: data.id,
      rawText: data.raw_text ?? '',
      skills: data.skills ?? [],
      targetRole: data.target_role,
      experienceYears: data.experience_years,
    };
  } else {
    resume = await getActiveResume(userId);
  }

  if (!resume?.rawText) {
    return null;
  }

  // Dedupe: if the caller supplied a content hash, look for a vulnerability
  // scan already run in the last 24h against any OTHER resume row with the
  // same hash (a byte-identical re-upload creates a new user_resumes row
  // each time, so resume_id alone can't catch this — only the hash can).
  if (fileHash) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: matchingResumes, error: matchError } = await supabase
      .from('user_resumes')
      .select('id')
      .eq('user_id', userId)
      .eq('file_hash', fileHash)
      .gte('uploaded_at', twentyFourHoursAgo);

    if (matchError) {
      console.error('Error checking for duplicate resume uploads:', matchError);
    }

    const matchingResumeIds = (matchingResumes ?? []).map((r) => r.id);

    if (matchingResumeIds.length > 0) {
      const { data: existingScan, error: existingScanError } = await supabase
        .from('resume_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('insight_type', 'vulnerability')
        .in('resume_id', matchingResumeIds)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingScanError) {
        console.error('Error looking up existing vulnerability scan for dedupe:', existingScanError);
      }

      if (existingScan) {
        const { data: copied, error: copyError } = await supabase
          .from('resume_insights')
          .insert({
            user_id: userId,
            resume_id: resume.id,
            session_id: null,
            insight_type: 'vulnerability',
            alignment_score: null,
            discrepancies: [],
            confirmations: [],
            vulnerabilities: existingScan.vulnerabilities,
            vulnerability_score: existingScan.vulnerability_score,
            resume_suggestions: [],
          })
          .select()
          .single();

        if (!copyError && copied) {
          return mapInsightFromDb(copied);
        }
        console.error('Error saving deduped vulnerability scan, falling back to a fresh scan:', copyError);
        // Fall through to running a real scan below.
      }
    }
  }

  // Run vulnerability scan
  const scan = await scanResumeVulnerabilities(
    resume.rawText,
    resume.skills,
    resume.targetRole,
    resume.experienceYears
  );

  // Save to database
  const { data, error } = await supabase
    .from('resume_insights')
    .insert({
      user_id: userId,
      resume_id: resume.id,
      session_id: null,
      insight_type: 'vulnerability',
      alignment_score: null,
      discrepancies: [],
      confirmations: [],
      vulnerabilities: scan.vulnerabilities as unknown as Json,
      vulnerability_score: scan.vulnerabilityScore,
      resume_suggestions: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving vulnerability scan:', error);
    return null;
  }

  return mapInsightFromDb(data);
}

/**
 * Generate suggestions from multiple sessions
 */
export async function generateAndSaveSuggestions(
  userId: string,
  sessionIds: string[]
): Promise<SuggestionBatch | null> {
  const resume = await getActiveResume(userId);
  if (!resume?.rawText) {
    return null;
  }

  const supabase = await createClient();

  // Fetch all sessions with messages
  const sessions = [];
  for (const sessionId of sessionIds) {
    const { data: session } = await supabase
      .from('interview_sessions')
      .select('id, interview_type, target_role')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) continue;

    const { data: messages } = await supabase
      .from('interview_messages')
      .select('role, content, analysis')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    const { data: scores } = await supabase
      .from('session_scores')
      .select('overall_score, clarity_score, star_usage_score, technical_depth')
      .eq('session_id', sessionId)
      .single();

    if (messages && scores) {
      sessions.push({
        sessionId,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          analysis: m.analysis as ResponseAnalysis | null,
        })),
        interviewType: session.interview_type,
        targetRole: session.target_role,
        scores: {
          overall_score: scores.overall_score ?? 0,
          clarity_score: scores.clarity_score ?? 0,
          star_usage_score: scores.star_usage_score ?? 0,
          technical_depth: scores.technical_depth ?? 0,
        },
      });
    }
  }

  if (sessions.length === 0) {
    return null;
  }

  // Generate suggestions
  const batch = await generateResumeSuggestions(resume.rawText, sessions);

  // Save to database
  const { error } = await supabase.from('resume_insights').insert({
    user_id: userId,
    resume_id: resume.id,
    session_id: sessions[0].sessionId, // Link to first session
    insight_type: 'suggestion',
    alignment_score: null,
    discrepancies: [],
    confirmations: [],
    vulnerabilities: [],
    vulnerability_score: null,
    resume_suggestions: batch.suggestions as unknown as Json,
  });

  if (error) {
    console.error('Error saving suggestions:', error);
  }

  return batch;
}

/**
 * Get all insights for a user
 */
export async function getUserInsights(
  userId: string,
  insightType?: ResumeInsight['insightType'],
  limit = 10
): Promise<ResumeInsight[]> {
  const supabase = await createClient();

  let query = supabase
    .from('resume_insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (insightType) {
    query = query.eq('insight_type', insightType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching insights:', error);
    return [];
  }

  return data.map(mapInsightFromDb);
}

/**
 * Get insight for a specific session
 */
export async function getSessionInsight(
  userId: string,
  sessionId: string
): Promise<ResumeInsight | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('resume_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .eq('insight_type', 'alignment')
    .single();

  if (error || !data) {
    return null;
  }

  return mapInsightFromDb(data);
}

/**
 * Get latest vulnerability scan
 */
export async function getLatestVulnerabilityScan(
  userId: string,
  resumeId?: string
): Promise<ResumeInsight | null> {
  const supabase = await createClient();

  let query = supabase
    .from('resume_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('insight_type', 'vulnerability')
    .order('created_at', { ascending: false })
    .limit(1);

  if (resumeId) {
    query = query.eq('resume_id', resumeId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return mapInsightFromDb(data);
}

/**
 * Calculate resume health score from recent insights
 */
export async function calculateResumeHealthScore(
  userId: string
): Promise<{
  score: number;
  alignmentAvg: number | null;
  vulnerabilityScore: number | null;
  insightsCount: number;
}> {
  const supabase = await createClient();

  // Get recent alignment scores
  const { data: alignments } = await supabase
    .from('resume_insights')
    .select('alignment_score')
    .eq('user_id', userId)
    .eq('insight_type', 'alignment')
    .not('alignment_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get latest vulnerability score
  const { data: vulnerability } = await supabase
    .from('resume_insights')
    .select('vulnerability_score')
    .eq('user_id', userId)
    .eq('insight_type', 'vulnerability')
    .not('vulnerability_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const alignmentAvg =
    alignments && alignments.length > 0
      ? alignments.reduce((a, b) => a + (b.alignment_score ?? 0), 0) /
        alignments.length
      : null;

  const vulnerabilityScore = vulnerability?.vulnerability_score ?? null;

  // Calculate health score (higher is better)
  // Alignment is good (higher = better)
  // Vulnerability is bad (higher = worse, so we invert it)
  let score = 50; // Default
  let factors = 0;

  if (alignmentAvg !== null) {
    score += alignmentAvg * 0.6;
    factors++;
  }

  if (vulnerabilityScore !== null) {
    score += (100 - vulnerabilityScore) * 0.4;
    factors++;
  }

  if (factors > 0) {
    score = Math.round(score / factors);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    alignmentAvg: alignmentAvg ? Math.round(alignmentAvg) : null,
    vulnerabilityScore,
    insightsCount: (alignments?.length ?? 0) + (vulnerability ? 1 : 0),
  };
}

// ===========================================
// HELPERS
// ===========================================

interface DbInsight {
  id: string;
  user_id: string;
  resume_id: string;
  session_id: string | null;
  insight_type: string;
  alignment_score: number | null;
  discrepancies: Json;
  confirmations: Json;
  vulnerabilities: Json;
  vulnerability_score: number | null;
  resume_suggestions: Json;
  created_at: string;
}

function mapInsightFromDb(data: DbInsight): ResumeInsight {
  return {
    id: data.id,
    userId: data.user_id,
    resumeId: data.resume_id,
    sessionId: data.session_id,
    insightType: data.insight_type as ResumeInsight['insightType'],
    alignmentScore: data.alignment_score,
    discrepancies: (data.discrepancies ?? []) as unknown as AlignmentAnalysis['discrepancies'],
    confirmations: (data.confirmations ?? []) as unknown as AlignmentAnalysis['confirmations'],
    vulnerabilities: (data.vulnerabilities ?? []) as unknown as VulnerabilityScan['vulnerabilities'],
    vulnerabilityScore: data.vulnerability_score,
    resumeSuggestions: (data.resume_suggestions ?? []) as unknown as ResumeSuggestion[],
    createdAt: data.created_at,
  };
}
