import { type NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient, getCurrentUser } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import {
  createChatCompletion,
  generateInterviewSystemPrompt,
  analyzeResponse,
  type ChatMessage,
} from '@/lib/ai/chat-client';
import { detectMoodTriggers, calculateMoodUpdate } from '@/lib/ai/mood-engine';
import { runPanelTurn } from '@/lib/ai/interview';
import {
  sanitizeInterviewerResponse,
  containsStageDirections,
  containsMetaCommentary,
} from '@/lib/ai/response-sanitizer';
import type {
  InterviewMessage,
  PersonalityBase,
  InterviewerMood,
  VoiceConfig,
  CommunicationStyle,
  QuestionPatterns,
  ResponseAnalysis,
  Json,
} from '@/types/database';
import type { PanelInterviewer, PanelState } from '@/types/panel';
import { INTERVIEWER_ARCHETYPES, type InterviewerArchetype } from '@/types/interviewer';

interface ChatRequestBody {
  message: string;
  responseTime?: number | null;
  interviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    backstory: string | null;
    personalityBase: PersonalityBase | null;
    currentMood: InterviewerMood | null;
    voiceConfig: VoiceConfig | null;
  };
  interviewerPersonality: {
    communicationStyle: CommunicationStyle | null;
    questionPatterns: QuestionPatterns | null;
    redFlags: string[] | null;
    greenFlags: string[] | null;
    petPeeves: string[] | null;
    favoriteTopics: string[] | null;
  } | null;
  interviewType: string;
  targetRole: string | null;
  targetCompany: string | null;
  companyStyle: string | null;
  resumeContext: string | null;
  messageHistory?: InterviewMessage[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify session belongs to user and get limits. Selects every column read
    // later in this handler (interview_type, max_user_messages, panel_state,
    // resume_targeting_context) so a single ownership-checked fetch replaces
    // the previous two-roundtrip pattern.
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, status, user_id, interview_type, max_user_messages, panel_state, resume_targeting_context')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interview session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Invalid state', message: 'This interview session is not active' },
        { status: 400 }
      );
    }

    const isPanelMode = session.interview_type === 'panel';

    // Get current user message count
    const { count: userMessageCount } = await supabase
      .from('interview_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('role', 'candidate');

    const maxMessages = session.max_user_messages ?? 20; // Default to standard
    const currentCount = userMessageCount ?? 0;

    // Check if session should be force-ended due to message limit
    if (currentCount >= maxMessages) {
      return NextResponse.json({
        content: "Thank you for your time today. We've covered a lot of ground in this interview. We'll be in touch soon with feedback and next steps.",
        should_end: true,
        limit_reached: true,
        message: 'Session message limit reached',
      });
    }

    // Rate-limit per session. A runaway client can loop this endpoint and
    // burn DeepSeek (single) or 3× DeepSeek (panel) tokens per turn. Scoped
    // by sessionId so two legitimate parallel sessions don't share a bucket.
    const rl = await checkRateLimit('chat', sessionId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit', message: 'Too many chat requests. Please slow down a moment.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await request.json() as ChatRequestBody;
    const {
      message,
      responseTime,
      interviewer,
      interviewerPersonality,
      interviewType,
      targetRole,
      targetCompany,
      companyStyle,
      resumeContext,
      messageHistory = [],
    } = body;

    const isStarting = message === '__START_INTERVIEW__';

    // Reject oversized messages before any AI call or DB write.
    // The sentinel value is 20 chars and is never affected by this check.
    // 4 000 chars comfortably covers the longest realistic STAR answer while
    // preventing cost-amplification from malformed or malicious requests.
    if (!isStarting && message.length > 4000) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Message exceeds the 4,000 character limit' },
        { status: 400 }
      );
    }

    // Sanity-bound response_time_seconds. The value is client-reported and
    // feeds into analytics + the CHECK-less interview_messages column; a
    // negative value or 9_999_999 would poison aggregates. 3600 (one hour)
    // is a generous ceiling for any real answer.
    if (responseTime !== undefined && responseTime !== null) {
      if (
        typeof responseTime !== 'number' ||
        !Number.isFinite(responseTime) ||
        responseTime < 0 ||
        responseTime > 3600
      ) {
        return NextResponse.json(
          { error: 'Validation error', message: 'responseTime must be a number between 0 and 3600 seconds' },
          { status: 400 }
        );
      }
    }

    // ── Panel mode: fetch panel members and use panel orchestration ───────────
    if (isPanelMode) {
      // Fetch panel members from session_interviewers
      const { data: sessionInterviewers } = await supabase
        .from('session_interviewers')
        .select(`
          interviewer_id,
          seat_order,
          role_label,
          is_lead,
          interviewers (
            id,
            name,
            avatar_url,
            personality_base
          )
        `)
        .eq('session_id', sessionId)
        .order('seat_order');

      if (!sessionInterviewers || sessionInterviewers.length === 0) {
        return NextResponse.json(
          { error: 'Invalid state', message: 'No panel members found for this session' },
          { status: 400 }
        );
      }

      // Build PanelInterviewer array
      const panel: PanelInterviewer[] = sessionInterviewers.map((si) => {
        const interviewerData = si.interviewers as unknown as {
          id: string;
          name: string;
          avatar_url: string | null;
          personality_base: PersonalityBase | null;
        };

        // Determine archetype from role preset
        const roleLabel = si.role_label;
        const roleLower = roleLabel?.toLowerCase() ?? '';
        const archetypeKey: InterviewerArchetype =
          roleLower.includes('tech') ? 'griller' :
          roleLower.includes('hr') ? 'culture_fit' :
          roleLower.includes('ceo') || roleLower.includes('vp') ? 'executive' :
          'skeptic';

        return {
          id: interviewerData.id,
          name: interviewerData.name,
          avatarUrl: interviewerData.avatar_url,
          roleLabel: roleLabel,
          archetype: archetypeKey,
          seatOrder: si.seat_order,
          isLead: si.is_lead ?? false,
          traits: interviewerData.personality_base ?? INTERVIEWER_ARCHETYPES[archetypeKey].basePersonality,
        };
      });

      // Get previous panel state
      const previousPanelState = session.panel_state as PanelState | null;

      // Run panel turn
      const panelResult = await runPanelTurn({
        sessionId,
        userAnswer: message,
        panel,
        previousPanelState,
        history: messageHistory,
        targetRole,
        targetCompany,
        resumeContext,
        isFirstTurn: isStarting,
      });

      // Use the service-role client for all server-side writes in the panel path.
      // The user-auth (anon key + cookie) client is used only for reads so that
      // RLS policies correctly scope the session ownership check. Writes go
      // through adminSupabase so they are never blocked by RLS edge cases
      // (particularly the trigger-driven interviewers.total_sessions UPDATE
      // introduced in the 20260424000001 migration, which runs in the
      // inserting user's security context and can cause silent insert failures
      // if the RLS UPDATE policy evaluation raises inside the trigger).
      const adminSupabase = createAdminClient();

      // Save user message (if not starting)
      let userMessageId: string | null = null;
      const warnings: string[] = [];

      // Normalise PanelTurnAnalysis (camelCase from LLM) to ResponseAnalysis
      // (snake_case expected by the HUD mapper and the interview_messages JSONB schema).
      const panelAnalysisForDb: ResponseAnalysis | null = panelResult.analysis
        ? {
            clarity_score:    panelResult.analysis.clarityScore    ?? 50,
            confidence_score: panelResult.analysis.confidenceScore ?? 50,
            relevance_score:  panelResult.analysis.relevanceScore  ?? 50,
            depth_score:      panelResult.analysis.depthScore      ?? 50,
            star_score:       panelResult.analysis.starScore       ?? 50,
            word_count:       message.split(/\s+/).length,
            filler_words:     [],
            key_points:       [],
            coaching_note:    panelResult.analysis.notes ?? null,
          }
        : null;

      if (!isStarting) {
        const { data: userMsg, error: userMsgError } = await adminSupabase
          .from('interview_messages')
          .insert({
            session_id: sessionId,
            role: 'candidate',
            content: message,
            response_time_seconds: responseTime,
            analysis: panelAnalysisForDb as unknown as Json,
          })
          .select('id')
          .single();

        if (userMsgError) {
          console.error('[Chat Panel] Error saving user message:', userMsgError);
          warnings.push('Failed to save your message to the session history.');
        } else {
          userMessageId = userMsg.id;
        }
      }

      // Save each panel member's response as separate message
      const panelMessageIds: string[] = [];
      for (const turn of panelResult.turns) {
        // Surface meta-commentary leaks ("As an AI…") in logs BEFORE
        // sanitization erases them — once the sentence is stripped the
        // raw evidence is gone, but the rate of leaks is the signal we
        // need to monitor system-prompt drift.
        if (containsMetaCommentary(turn.text)) {
          console.warn(`[Chat Panel] AI self-identification leak in ${turn.speakerName}'s response — sanitizing.`);
        }
        const cleanText = sanitizeInterviewerResponse(turn.text);
        if (cleanText !== turn.text) {
          console.warn(`[Chat Panel] Stage directions or meta-commentary stripped from ${turn.speakerName}'s response.`);
        }
        const { data: panelMsg, error: panelMsgError } = await adminSupabase
          .from('interview_messages')
          .insert({
            session_id: sessionId,
            role: 'interviewer',
            content: cleanText,
            interviewer_id: turn.interviewerId,
          })
          .select('id')
          .single();

        if (panelMsgError) {
          console.error('[Chat Panel] Error saving panel message:', panelMsgError);
          warnings.push(`Failed to save response from ${turn.speakerName}.`);
        } else if (panelMsg) {
          panelMessageIds.push(panelMsg.id);
        }
      }

      // Update session panel_state via admin client (same reason as message writes above).
      const { error: updateError } = await adminSupabase
        .from('interview_sessions')
        .update({ panel_state: panelResult.panelState as unknown as Json })
        .eq('id', sessionId);

      if (updateError) {
        console.error('[Chat Panel] Error updating panel_state:', updateError);
      }

      // Check for session end
      const messagesAfterThis = currentCount + 1;
      const isAtLimit = messagesAfterThis >= maxMessages;
      const isNearLimit = messagesAfterThis >= maxMessages - 1;

      const lastTurnText = panelResult.turns[panelResult.turns.length - 1]?.text.toLowerCase() || '';
      const shouldEnd = lastTurnText.includes('thank you for your time') ||
                        lastTurnText.includes('that concludes our interview') ||
                        lastTurnText.includes('we\'ll be in touch') ||
                        isAtLimit;

      return NextResponse.json({
        panel_turns: panelResult.turns.map((turn) => ({
          ...turn,
          text: sanitizeInterviewerResponse(turn.text),
        })),
        panel_state: panelResult.panelState,
        // Return the normalised snake_case ResponseAnalysis so the HUD mapper
        // (responseAnalysisToHudTurn) receives the shape it expects. The raw
        // PanelTurnAnalysis uses camelCase which caused all HUD metric scores
        // to read as undefined (→ 0) before this fix.
        analysis: panelAnalysisForDb,
        user_message_id: userMessageId,
        panel_message_ids: panelMessageIds,
        should_end: shouldEnd,
        messages_remaining: Math.max(0, maxMessages - messagesAfterThis),
        ...(isNearLimit && !isAtLimit ? { limit_warning: `${maxMessages - messagesAfterThis} responses remaining in this session` } : {}),
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    }

    // On session start, fetch resume so the system prompt knows whether
    // to open with a targeted question or a generic introduction.
    // No pre-generated question pool — the AI reads all context (backstory,
    // personality, resume, role, company style) and questions naturally
    // from the conversation in real time.
    let hasResume = false;

    if (isStarting) {
      const { data: resume } = await supabase
        .from('user_resumes')
        .select('skills, experience_years, parsed_data')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      hasResume = (resume?.skills?.length ?? 0) > 0 || !!resume?.parsed_data;
    } else {
      hasResume = !!resumeContext && resumeContext.length > 0;
    }

    // Get resume targeting context if set
    const resumeTargetingContext = session.resume_targeting_context as {
      promptContext?: string;
    } | null;

    // Build system prompt
    const systemPrompt = generateInterviewSystemPrompt({
      interviewerName: interviewer.name,
      interviewType,
      companyStyle: companyStyle ?? null,
      targetCompany: targetCompany ?? null,
      roleTarget: targetRole,
      backstory: interviewer.backstory,
      personality: interviewer.personalityBase,
      communicationStyle: interviewerPersonality?.communicationStyle ?? null,
      redFlags: interviewerPersonality?.redFlags ?? null,
      greenFlags: interviewerPersonality?.greenFlags ?? null,
      petPeeves: interviewerPersonality?.petPeeves ?? null,
      favoriteTopics: interviewerPersonality?.favoriteTopics ?? null,
      resumeContext,
      currentMood: interviewer.currentMood,
      hasResume,
      resumeTargetingContext: resumeTargetingContext?.promptContext ?? null,
    });

    // Build message history for AI
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (!isStarting && messageHistory.length > 0) {
      for (const msg of messageHistory) {
        aiMessages.push({
          role: msg.role === 'interviewer' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    // Add current message
    if (!isStarting) {
      aiMessages.push({ role: 'user', content: message });
    }

    // Get AI response
    const completion = await createChatCompletion(aiMessages, {
      temperature: 0.8,
      max_tokens: 1024,
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      throw new Error('No response from AI');
    }

    // Strip stage directions, internal thoughts, markdown, and AI self-
    // identification from the response. The system prompt forbids this
    // output but models occasionally slip — log each category separately
    // so the rate of each kind of drift is independently visible in
    // production logs.
    if (containsStageDirections(rawResponse)) {
      console.warn('[Chat] Stage directions detected in AI response — sanitizing.');
    }
    if (containsMetaCommentary(rawResponse)) {
      console.warn('[Chat] AI self-identification leak detected in response — sanitizing.');
    }
    const aiResponse = sanitizeInterviewerResponse(rawResponse);

    // Check if interview should end (AI indicates wrap-up or limit approaching)
    const messagesAfterThis = currentCount + 1;
    const isNearLimit = messagesAfterThis >= maxMessages - 1;
    const isAtLimit = messagesAfterThis >= maxMessages;

    const shouldEnd = aiResponse.toLowerCase().includes('thank you for your time') ||
                      aiResponse.toLowerCase().includes('that concludes our interview') ||
                      aiResponse.toLowerCase().includes('we\'ll be in touch') ||
                      isAtLimit;

    // Save messages to database
    let userMessageId: string | null = null;
    let analysis = null;
    const warnings: string[] = [];

    if (!isStarting) {
      // Analyze user response
      const lastInterviewerMessage = messageHistory
        .filter((m) => m.role === 'interviewer')
        .pop();

      if (lastInterviewerMessage) {
        // Small delay to reduce rate limit collisions with the main chat completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        analysis = await analyzeResponse(
          message,
          lastInterviewerMessage.content,
          interviewType
        );
      }

      // Save user message
      const { data: userMsg, error: userMsgError } = await supabase
        .from('interview_messages')
        .insert({
          session_id: sessionId,
          role: 'candidate',
          content: message,
          response_time_seconds: responseTime,
          analysis,
        })
        .select('id')
        .single();

      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
        warnings.push('Failed to save your message to the session history.');
      } else {
        userMessageId = userMsg.id;
      }
    }

    // Save interviewer message
    const { data: interviewerMsg, error: interviewerMsgError } = await supabase
      .from('interview_messages')
      .insert({
        session_id: sessionId,
        role: 'interviewer',
        content: aiResponse,
      })
      .select('id')
      .single();

    if (interviewerMsgError) {
      console.error('Error saving interviewer message:', interviewerMsgError);
      warnings.push('Failed to save interviewer response to the session history.');
    }

    // Update interviewer mood based on trigger detection
    if (analysis && interviewer.currentMood) {
      const triggers = detectMoodTriggers({
        analysis,
        redFlags: interviewerPersonality?.redFlags ?? [],
        greenFlags: interviewerPersonality?.greenFlags ?? [],
        petPeeves: interviewerPersonality?.petPeeves ?? [],
        favoriteTopics: interviewerPersonality?.favoriteTopics ?? [],
        candidateMessage: message,
      });

      const updatedMood = calculateMoodUpdate(interviewer.currentMood, triggers);

      await supabase
        .from('interviewers')
        .update({
          current_mood: updatedMood as unknown as Json,
        })
        .eq('id', interviewer.id);
    }

    return NextResponse.json({
      content: aiResponse,
      user_message_id: userMessageId,
      interviewer_message_id: interviewerMsg?.id,
      analysis,
      should_end: shouldEnd,
      messages_remaining: Math.max(0, maxMessages - messagesAfterThis),
      ...(isNearLimit && !isAtLimit ? { limit_warning: `${maxMessages - messagesAfterThis} responses remaining in this session` } : {}),
      ...(warnings.length > 0 ? { warnings } : {}),
    });

  } catch (error) {
    console.error('Error in interview chat:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
