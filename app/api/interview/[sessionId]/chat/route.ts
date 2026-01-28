import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/server';
import {
  createChatCompletion,
  generateInterviewSystemPrompt,
  analyzeResponse,
  type ChatMessage,
} from '@/lib/ai/chat-client';
import type {
  InterviewMessage,
  PersonalityBase,
  InterviewerMood,
  VoiceConfig,
  CommunicationStyle,
  QuestionPatterns,
} from '@/types/database';

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
  resumeContext: string | null;
  messageHistory?: InterviewMessage[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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

    // Verify session belongs to user
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

    const body: ChatRequestBody = await request.json();
    const {
      message,
      responseTime,
      interviewer,
      interviewerPersonality,
      interviewType,
      targetRole,
      targetCompany,
      resumeContext,
      messageHistory = [],
    } = body;

    const isStarting = message === '__START_INTERVIEW__';

    // Build system prompt
    const systemPrompt = generateInterviewSystemPrompt({
      interviewerName: interviewer.name,
      interviewType,
      companyStyle: targetCompany,
      roleTarget: targetRole,
      backstory: interviewer.backstory,
      personality: interviewer.personalityBase,
      communicationStyle: interviewerPersonality?.communicationStyle || null,
      redFlags: interviewerPersonality?.redFlags || null,
      greenFlags: interviewerPersonality?.greenFlags || null,
      petPeeves: interviewerPersonality?.petPeeves || null,
      favoriteTopics: interviewerPersonality?.favoriteTopics || null,
      resumeContext,
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

    // Check if interview should end (AI indicates wrap-up)
    const shouldEnd = aiResponse.toLowerCase().includes('thank you for your time') ||
                      aiResponse.toLowerCase().includes('that concludes our interview') ||
                      aiResponse.toLowerCase().includes('we\'ll be in touch') ||
                      messageHistory.length >= 20; // Max 20 exchanges

    // Save messages to database
    let userMessageId: string | null = null;
    let analysis = null;

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
    }

    // Update interviewer mood based on response quality
    if (analysis && interviewer.currentMood) {
      const avgScore = (
        analysis.star_score +
        analysis.clarity_score +
        analysis.confidence_score +
        analysis.relevance_score +
        analysis.depth_score
      ) / 5;

      let newMood: InterviewerMood['current'] = 'neutral';
      if (avgScore >= 80) newMood = 'impressed';
      else if (avgScore >= 60) newMood = 'engaged';
      else if (avgScore >= 40) newMood = 'neutral';
      else if (avgScore >= 20) newMood = 'skeptical';
      else newMood = 'critical';

      await supabase
        .from('interviewers')
        .update({
          current_mood: {
            current: newMood,
            intensity: Math.min(100, interviewer.currentMood.intensity + (avgScore > 50 ? 5 : -5)),
            triggers: analysis.key_points.slice(0, 3),
          },
        })
        .eq('id', interviewer.id);
    }

    return NextResponse.json({
      content: aiResponse,
      user_message_id: userMessageId,
      interviewer_message_id: interviewerMsg?.id,
      analysis,
      should_end: shouldEnd,
    });

  } catch (error) {
    console.error('Error in interview chat:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
