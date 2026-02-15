import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import { COMPANY_STYLE_MODIFIERS } from '@/types/interviewer';
import { isSegmindConfigured, generateSceneImage } from '@/lib/image/segmind';
import type { CompanyStyle, InterviewType } from '@/types/database';

interface GenerateSceneRequest {
  companyStyle: CompanyStyle;
  interviewType: InterviewType;
  generateImage?: boolean;
}

interface SceneData {
  title: string;
  description: string;
  atmosphere: string;
  details: string[];
}

/** Parsed JSON structure from AI scene generation */
interface ParsedSceneResponse {
  title?: string;
  description?: string;
  atmosphere?: string;
  details?: unknown[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body = await request.json() as GenerateSceneRequest;
    const { companyStyle, interviewType, generateImage = true } = body;

    // Validate company style
    const validCompanyStyles: CompanyStyle[] = [
      'faang', 'startup', 'consulting', 'enterprise', 'agency', 'government'
    ];
    if (!companyStyle || !validCompanyStyles.includes(companyStyle)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Valid companyStyle is required' },
        { status: 400 }
      );
    }

    // Validate interview type
    const validInterviewTypes: InterviewType[] = [
      'behavioral', 'technical', 'case', 'hr', 'panel', 'phone_screen'
    ];
    if (!interviewType || !validInterviewTypes.includes(interviewType)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Valid interviewType is required' },
        { status: 400 }
      );
    }

    const styleModifier = COMPANY_STYLE_MODIFIERS[companyStyle];

    // Generate scene description using AI
    let scene: SceneData;

    const prompt = `Generate a vivid interview room scene description for a ${interviewType} interview at a ${styleModifier.name} company.

Base environment: ${styleModifier.environmentDescription}

Generate a JSON response with:
{
  "title": "Brief scene title (e.g., 'Corner Office with City View')",
  "description": "2-3 sentence immersive description of the room",
  "atmosphere": "One sentence describing the mood/feeling",
  "details": ["4-5 specific visual details that set the scene"]
}

Make it feel real and slightly intimidating. The candidate should feel the weight of the interview.
Return ONLY valid JSON.`;

    try {
      const completion = await createChatCompletion(
        [
          { role: 'system', content: 'You generate vivid scene descriptions for interview simulation. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        {
          model: AI_MODELS.ANALYSIS,
          ...MODEL_PARAMS.analysis,
          temperature: 0.8,
        }
      );

      let content = completion.choices[0]?.message?.content || '{}';
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

      const parsed = JSON.parse(content) as ParsedSceneResponse;

      scene = {
        title: typeof parsed.title === 'string' ? parsed.title : getDefaultScene(companyStyle).title,
        description: typeof parsed.description === 'string' ? parsed.description : getDefaultScene(companyStyle).description,
        atmosphere: typeof parsed.atmosphere === 'string' ? parsed.atmosphere : getDefaultScene(companyStyle).atmosphere,
        details: Array.isArray(parsed.details)
          ? parsed.details.filter((d): d is string => typeof d === 'string').slice(0, 6)
          : getDefaultScene(companyStyle).details,
      };

    } catch (parseError) {
      console.error('Error parsing AI scene response:', parseError);
      scene = getDefaultScene(companyStyle);
    }

    // Generate image if requested and Segmind is configured
    let imageData: { base64: string; seed: number } | null = null;

    if (generateImage && isSegmindConfigured()) {
      try {
        const imagePrompt = `${scene.description} ${scene.details.join('. ')}`;
        imageData = await generateSceneImage(imagePrompt, companyStyle);
      } catch (imageError) {
        console.error('Error generating scene image:', imageError);
        // Continue without image - don't fail the whole request
      }
    }

    return NextResponse.json({
      scene,
      image: imageData ? {
        base64: imageData.base64,
        seed: imageData.seed,
        format: 'png',
        width: 1024,
        height: 768,
      } : null,
      imageAvailable: isSegmindConfigured(),
    });

  } catch (error) {
    console.error('Error generating scene:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to generate scene' },
      { status: 500 }
    );
  }
}

function getDefaultScene(companyStyle: CompanyStyle): SceneData {
  const defaults: Record<CompanyStyle, SceneData> = {
    faang: {
      title: 'Modern Tech Campus Conference Room',
      description: 'A sleek glass-walled conference room on the 15th floor overlooking the tech campus. Whiteboards line one wall, covered in faded diagrams from previous meetings.',
      atmosphere: 'The room hums with quiet intensity—this is where careers are made or broken.',
      details: [
        'Floor-to-ceiling windows with anti-glare coating',
        'A large digital display showing the company logo',
        'Ergonomic chairs arranged around a white oval table',
        'A tray of sparkling water and branded notebooks',
        'Soft LED lighting that adjusts automatically',
      ],
    },
    startup: {
      title: 'Open Office Meeting Corner',
      description: 'A casual corner of the open office with mismatched furniture and a standing desk nearby. Energy drinks and snack wrappers hint at recent late nights.',
      atmosphere: 'The chaos feels intentional—move fast, break things, prove yourself.',
      details: [
        'Bean bag chairs next to a worn leather couch',
        'A ping pong table visible in the background',
        'Sticky notes covering a nearby glass partition',
        'A mini fridge stocked with cold brew',
        'Exposed brick and industrial lighting',
      ],
    },
    consulting: {
      title: 'Executive Conference Suite',
      description: 'An impeccably designed boardroom with mahogany furniture and leather chairs. The city skyline stretches beyond floor-to-ceiling windows.',
      atmosphere: 'Every detail whispers expensive—this is where serious business happens.',
      details: [
        'A polished mahogany conference table for twelve',
        'Leather chairs with brass studs',
        'Framed awards and client logos on the walls',
        'A silver coffee service on the credenza',
        'Thick carpet that absorbs all sound',
      ],
    },
    enterprise: {
      title: 'Corporate Headquarters Meeting Room',
      description: 'A large, neutral meeting room with corporate art and a long table. Name placards suggest this room hosts important decisions regularly.',
      atmosphere: 'The room feels official and slightly impersonal—process matters here.',
      details: [
        'A projection screen at the head of the table',
        'Corporate values poster on the wall',
        'A speakerphone in the center of the table',
        'Blinds partially drawn against the afternoon sun',
        'A clock prominently displayed above the door',
      ],
    },
    agency: {
      title: 'Creative Studio Interview Space',
      description: 'A colorful open space with mood boards, design samples, and multiple screens showing recent work. The energy is creative but deadline-driven.',
      atmosphere: 'Creativity meets chaos—they need someone who thrives under pressure.',
      details: [
        'Mood boards with fabric swatches and color palettes',
        'iMacs displaying recent campaign work',
        'A wall of industry awards and press clippings',
        'Sketch pads and markers scattered on the table',
        'A coffee bar with an espresso machine',
      ],
    },
    government: {
      title: 'Official Interview Room',
      description: 'A formal, no-frills interview room with institutional furniture and American flags. Security badges hang from lanyards on the interviewers.',
      atmosphere: 'Everything is by the book—precision and protocol rule here.',
      details: [
        'American and agency flags in the corner',
        'A laminated interview scoring rubric on the table',
        'Security cameras in two corners',
        'Fluorescent lighting with a slight flicker',
        'A water pitcher and paper cups',
      ],
    },
  };

  return defaults[companyStyle];
}
