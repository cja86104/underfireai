import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import {
  createChatCompletion,
  generateInterviewSystemPrompt,
  analyzeResponse,
  type ChatMessage,
} from '@/lib/ai/chat-client';
import { generateQuestions } from '@/lib/interview/question-generator';
import { detectMoodTriggers, calculateMoodUpdate } from '@/lib/ai/mood-engine';
import { runPanelTurn } from '@/lib/ai/interview';
import type {
  InterviewMessage,
  PersonalityBase,
  InterviewerMood,
  VoiceConfig,
  CommunicationStyle,
  QuestionPatterns,
  Json,
  CompanyStyle,
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

    // Verify session belongs to user and get limits
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, status, user_id')
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

    // Get full session data (includes session_length, max_user_messages, interview_type, panel_state)
    const { data: sessionData } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    const isPanelMode = sessionData?.interview_type === 'panel';

    // Get current user message count
    const { count: userMessageCount } = await supabase
      .from('interview_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('role', 'candidate');

    const maxMessages = sessionData?.max_user_messages ?? 20; // Default to standard
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
      const previousPanelState = sessionData?.panel_state as PanelState | null;

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

      // Save user message (if not starting)
      let userMessageId: string | null = null;
      const warnings: string[] = [];

      if (!isStarting) {
        const { data: userMsg, error: userMsgError } = await supabase
          .from('interview_messages')
          .insert({
            session_id: sessionId,
            role: 'candidate',
            content: message,
            response_time_seconds: responseTime,
            analysis: panelResult.analysis ? {
              clarity_score: panelResult.analysis.clarityScore,
              confidence_score: panelResult.analysis.confidenceScore,
              relevance_score: panelResult.analysis.relevanceScore,
              depth_score: panelResult.analysis.depthScore,
              star_score: panelResult.analysis.starScore,
              notes: panelResult.analysis.notes,
            } : null,
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

      // Save each panel member's response as separate message
      const panelMessageIds: string[] = [];
      for (const turn of panelResult.turns) {
        const { data: panelMsg, error: panelMsgError } = await supabase
          .from('interview_messages')
          .insert({
            session_id: sessionId,
            role: 'interviewer',
            content: turn.text,
            interviewer_id: turn.interviewerId,
          })
          .select('id')
          .single();

        if (panelMsgError) {
          console.error('Error saving panel message:', panelMsgError);
          warnings.push(`Failed to save response from ${turn.speakerName}.`);
        } else if (panelMsg) {
          panelMessageIds.push(panelMsg.id);
        }
      }

      // Update session panel_state
      const { error: updateError } = await supabase
        .from('interview_sessions')
        .update({ panel_state: panelResult.panelState as unknown as Json })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating panel_state:', updateError);
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
        panel_turns: panelResult.turns,
        panel_state: panelResult.panelState,
        analysis: panelResult.analysis,
        user_message_id: userMessageId,
        panel_message_ids: panelMessageIds,
        should_end: shouldEnd,
        messages_remaining: Math.max(0, maxMessages - messagesAfterThis),
        ...(isNearLimit && !isAtLimit ? { limit_warning: `${maxMessages - messagesAfterThis} responses remaining in this session` } : {}),
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    }

    // On session start, generate a question set from full context (resume, role, company, difficulty)
    let generatedQuestions: string[] = [];
    let hasResume = false;

    if (isStarting) {
      // Fetch resume server-side — authoritative source, not reliant on client
      const { data: resume } = await supabase
        .from('user_resumes')
        .select('skills, experience_years, parsed_data')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const resumeSkills: string[] = resume?.skills ?? [];
      const experienceYears: number | undefined = resume?.experience_years ?? undefined;
      hasResume = resumeSkills.length > 0 || !!resume?.parsed_data;

      try {
        const questions = await generateQuestions(
          {
            interviewType: interviewType as Parameters<typeof generateQuestions>[0]['interviewType'],
            companyStyle: (companyStyle as CompanyStyle) ?? null,
            targetCompany: targetCompany ?? null,
            roleTarget: targetRole ?? null,
            skills: resumeSkills,
            experienceYears,
            difficulty: sessionData?.difficulty ?? 5,
          },
          7
        );
        generatedQuestions = questions.map(q => q.question);
      } catch (qErr) {
        // Non-fatal — interview proceeds without pre-generated questions
        console.error('Failed to pre-generate questions:', qErr);
      }
    } else {
      // For ongoing messages, check if resume exists to inform opening style
      hasResume = !!resumeContext && resumeContext.length > 0;
    }

    // Get resume targeting context if set (Premium feature)
    const resumeTargetingContext = sessionData?.resume_targeting_context as {
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
      generatedQuestions: generatedQuestions.length > 0 ? generatedQuestions : null,
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

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

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
