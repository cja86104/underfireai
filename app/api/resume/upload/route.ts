import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import { generateAndSaveVulnerabilityScan } from '@/lib/resume/insights-service';
import type { Json } from '@/types/database';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/** Parsed resume data structure */
interface ParsedResumeUploadData {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  experience: {
    company: string;
    title: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    highlights?: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field?: string;
    graduation_date?: string;
  }[];
  skills: string[];
  certifications: string[];
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetRole = formData.get('target_role') as string | null;
    const replaceId = formData.get('replace_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Validation error', message: 'File too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Read file content
    let rawText = '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      if (file.type === 'text/plain') {
        // Plain text - direct conversion
        rawText = buffer.toString('utf-8');
      } else if (file.type === 'application/pdf') {
        // PDF - use pdf-parse library
        const pdfData = await pdf(buffer);
        rawText = pdfData.text;

        // Clean up common PDF extraction artifacts
        rawText = rawText
          .replace(/\f/g, '\n') // Form feeds to newlines
          .replace(/\r\n/g, '\n') // Normalize line endings
          .replace(/\n{3,}/g, '\n\n') // Collapse multiple blank lines
          .trim();
      } else if (
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // DOC/DOCX - use mammoth library
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;

        // Log any conversion warnings (optional, for debugging)
        if (result.messages.length > 0) {
          console.warn('Mammoth conversion messages:', result.messages);
        }
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { error: 'Parse error', message: 'Could not read file content. The file may be corrupted or password-protected.' },
        { status: 400 }
      );
    }

    // Validate extracted content
    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Parse error', message: 'Could not extract sufficient text from file. Please ensure the file contains readable text content.' },
        { status: 400 }
      );
    }

    // Truncate if too long (keep first 8000 chars for AI processing)
    const textForParsing = rawText.slice(0, 8000);

    // Use AI to parse resume
    const parsePrompt = `Extract structured data from this resume text. Return ONLY valid JSON.

RESUME TEXT:
${textForParsing}

Extract and return this JSON structure:
{
  "name": "Full name or null",
  "email": "Email or null",
  "phone": "Phone or null",
  "location": "City, State or null",
  "summary": "Professional summary (1-2 sentences) or null",
  "experience": [
    {
      "company": "Company name",
      "title": "Job title",
      "start_date": "Start date or year",
      "end_date": "End date or 'Present' or null",
      "description": "Brief description",
      "highlights": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "School name",
      "degree": "Degree type",
      "field": "Field of study",
      "graduation_date": "Year or date"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "certifications": ["cert1", "cert2"]
}

Return ONLY the JSON object, no markdown or explanation.`;

    let parsedData: ParsedResumeUploadData = {
      name: null,
      email: null,
      phone: null,
      location: null,
      summary: null,
      experience: [],
      education: [],
      skills: [],
      certifications: [],
    };

    let skills: string[] = [];
    let experienceYears = 0;

    try {
      const aiMessages: ChatMessage[] = [
        { role: 'system', content: 'You are a resume parser. Extract structured data and return only valid JSON.' },
        { role: 'user', content: parsePrompt },
      ];

      const completion = await createChatCompletion(aiMessages, {
        model: AI_MODELS.RESUME_PARSE,
        ...MODEL_PARAMS.resumeParse,
      });

      const content = completion.choices[0]?.message?.content || '{}';

      // Clean up potential markdown formatting
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsedData = JSON.parse(cleanContent) as ParsedResumeUploadData;
      skills = parsedData.skills ?? [];

      // Calculate experience years
      if (parsedData.experience && parsedData.experience.length > 0) {
        const currentYear = new Date().getFullYear();
        let totalYears = 0;

        for (const exp of parsedData.experience) {
          const startMatch = exp.start_date?.match(/\d{4}/);
          const endMatch = exp.end_date?.match(/\d{4}/);

          if (startMatch) {
            const startYear = parseInt(startMatch[0]);
            const endYear =
              exp.end_date?.toLowerCase() === 'present' || !endMatch
                ? currentYear
                : parseInt(endMatch[0]);

            totalYears += Math.max(0, endYear - startYear);
          }
        }

        // Account for overlapping jobs by capping at reasonable max
        experienceYears = Math.min(totalYears, currentYear - 1970);
      }
    } catch (parseError) {
      console.error('AI parsing error:', parseError);
      // Continue with empty parsed data - we still have raw text
    }

    const supabase = await createClient();

    // Delete existing resume if replacing
    if (replaceId) {
      await supabase
        .from('user_resumes')
        .delete()
        .eq('id', replaceId)
        .eq('user_id', user.id);
    }

    // Save to database
    const { data: resume, error: insertError } = await supabase
      .from('user_resumes')
      .insert({
        user_id: user.id,
        raw_text: rawText.slice(0, 50000), // Limit stored text
        parsed_data: parsedData as unknown as Json,
        skills,
        experience_years: experienceYears,
        target_role: targetRole ?? null,
        target_company_type: null,
        file_url: null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to save resume' },
        { status: 500 }
      );
    }

    // Check if user is paid to trigger vulnerability scan
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const isPaidUser = profile?.subscription_tier !== 'free';

    // Trigger vulnerability scan asynchronously for paid users
    if (isPaidUser) {
      generateAndSaveVulnerabilityScan(user.id, resume.id).catch((err: unknown) => {
        console.error('Background vulnerability scan error:', err);
      });
    }

    return NextResponse.json({
      success: true,
      resume_id: resume.id,
      parsed: {
        name: parsedData.name,
        skills_count: skills.length,
        experience_years: experienceYears,
        has_education: (parsedData.education?.length || 0) > 0,
        has_experience: (parsedData.experience?.length || 0) > 0,
      },
      vulnerability_scan_triggered: isPaidUser,
      message: 'Resume uploaded and parsed successfully',
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
