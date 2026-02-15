/**
 * UnderFireAI - Resume Parser
 *
 * Parses PDF and text resumes into structured data.
 */

import pdfParse from 'pdf-parse';
import type { ParsedResumeData, WorkExperience, Education } from '@/types/database';

export interface ParseResult {
  rawText: string;
  parsedData: ParsedResumeData | null;
  confidence: number;
  warnings: string[];
}

/**
 * Parse a PDF buffer into text and structured data
 */
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  const warnings: string[] = [];

  try {
    const data = await pdfParse(buffer);
    const rawText = data.text;

    if (!rawText || rawText.trim().length < 50) {
      return {
        rawText: '',
        parsedData: null,
        confidence: 0,
        warnings: ['PDF appears to be empty or image-based (not parseable)'],
      };
    }

    const parsedData = parseResumeText(rawText);
    const confidence = calculateConfidence(parsedData);

    if (confidence < 50) {
      warnings.push('Low confidence in parsed data - manual review recommended');
    }

    return {
      rawText,
      parsedData,
      confidence,
      warnings,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      rawText: '',
      parsedData: null,
      confidence: 0,
      warnings: ['Failed to parse PDF file'],
    };
  }
}

/**
 * Parse plain text resume
 */
export function parseText(text: string): ParseResult {
  const warnings: string[] = [];

  if (!text || text.trim().length < 50) {
    return {
      rawText: text,
      parsedData: null,
      confidence: 0,
      warnings: ['Text is too short to be a valid resume'],
    };
  }

  const parsedData = parseResumeText(text);
  const confidence = calculateConfidence(parsedData);

  if (confidence < 50) {
    warnings.push('Low confidence in parsed data - consider AI extraction');
  }

  return {
    rawText: text,
    parsedData,
    confidence,
    warnings,
  };
}

/**
 * Basic regex-based resume parsing
 */
function parseResumeText(text: string): ParsedResumeData {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  return {
    name: extractName(lines),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    summary: extractSummary(text),
    experience: extractExperience(text),
    education: extractEducation(text),
    skills: extractSkills(text),
    certifications: extractCertifications(text),
  };
}

function extractName(lines: string[]): string | undefined {
  // Name is usually the first non-empty line that doesn't look like a header
  for (const line of lines.slice(0, 5)) {
    if (
      line.length > 2 &&
      line.length < 50 &&
      !line.includes('@') &&
      !(/^\d/.exec(line)) &&
      !(/^(resume|cv|curriculum)/i.exec(line))
    ) {
      // Check if it looks like a name (2-4 words, capitalized)
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const looksLikeName = words.every(
          w => w.length > 1 && w.startsWith(w[0].toUpperCase())
        );
        if (looksLikeName) {
          return line;
        }
      }
    }
  }
  return undefined;
}

function extractEmail(text: string): string | undefined {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = emailRegex.exec(text);
  return match ? match[0].toLowerCase() : undefined;
}

function extractPhone(text: string): string | undefined {
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/;
  const match = phoneRegex.exec(text);
  return match ? match[0] : undefined;
}

function extractLocation(text: string): string | undefined {
  // Look for city, state patterns
  const locationRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+)/;
  const match = locationRegex.exec(text);
  return match ? match[0] : undefined;
}

function extractSummary(text: string): string | undefined {
  const summaryPatterns = [
    /(?:summary|profile|objective|about)\s*:?\s*\n?([\s\S]{50,500}?)(?=\n\n|\nexperience|\neducation|\nskills)/i,
  ];

  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().replace(/\n/g, ' ');
    }
  }

  return undefined;
}

function extractExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];

  // Look for experience section
  const expSection = /(?:experience|employment|work history)\s*:?\s*\n([\s\S]*?)(?=\n(?:education|skills|certifications|projects)|$)/i.exec(text);

  if (!expSection) return experiences;

  const content = expSection[1];

  // Simple pattern: Company name followed by title and dates
  const jobPattern = /([A-Z][^\n]+)\n([^\n]+)\n(\d{4}[\s\-–to]+(?:\d{4}|present|current))/gi;

  let match;
  while ((match = jobPattern.exec(content)) !== null) {
    const [, company, title, dateRange] = match;

    const dates = /(\d{4})[\s\-–to]+(\d{4}|present|current)/i.exec(dateRange);
    const startDate = dates ? dates[1] : '';
    const endDate = dates && dates[2].toLowerCase() !== 'present' && dates[2].toLowerCase() !== 'current'
      ? dates[2]
      : null;

    experiences.push({
      company: company.trim(),
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      description: '',
      highlights: [],
    });
  }

  return experiences.slice(0, 10);
}

function extractEducation(text: string): Education[] {
  const education: Education[] = [];

  // Look for education section
  const eduSection = /(?:education|academic)\s*:?\s*\n([\s\S]*?)(?=\n(?:experience|skills|certifications|projects)|$)/i.exec(text);

  if (!eduSection) return education;

  const content = eduSection[1];

  // Look for degree patterns
  const degreePattern = /(bachelor|master|phd|associate|bs|ba|ms|ma|mba|doctorate)[^\n]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;

  let match;
  while ((match = degreePattern.exec(content)) !== null) {
    const [, degree, field] = match;

    // Try to find institution
    const lines = content.split('\n');
    let institution = '';

    for (const line of lines) {
      if (/university|college|institute|school/i.exec(line)) {
        institution = line.trim();
        break;
      }
    }

    // Try to find graduation date
    const yearMatch = /\b(19|20)\d{2}\b/.exec(content);

    education.push({
      institution: institution || 'Unknown Institution',
      degree: degree.trim(),
      field: field.trim(),
      graduation_date: yearMatch ? yearMatch[0] : '',
    });
  }

  return education.slice(0, 5);
}

function extractSkills(text: string): string[] {
  const skills: string[] = [];

  // Look for skills section
  const skillsSection = /(?:skills|technologies|technical skills|competencies)\s*:?\s*\n?([\s\S]*?)(?=\n(?:experience|education|certifications|projects)|$)/i.exec(text);

  if (skillsSection) {
    const content = skillsSection[1];

    // Split by common delimiters
    const extracted = content
      .split(/[,•·|;\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 30)
      .filter(s => !(/^\d+$/.exec(s)));

    skills.push(...extracted);
  }

  // Also look for common skill keywords throughout
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Node.js',
    'SQL', 'AWS', 'Docker', 'Kubernetes', 'Git', 'Agile', 'Scrum',
  ];

  for (const skill of commonSkills) {
    if (text.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
      skills.push(skill);
    }
  }

  return [...new Set(skills)].slice(0, 50);
}

function extractCertifications(text: string): string[] {
  const certifications: string[] = [];

  const certSection = /(?:certifications?|licenses?|credentials?)\s*:?\s*\n?([\s\S]*?)(?=\n(?:experience|education|skills|projects)|$)/i.exec(text);

  if (certSection) {
    const lines = certSection[1].split('\n').map(l => l.trim()).filter(l => l.length > 5);
    certifications.push(...lines.slice(0, 10));
  }

  return certifications;
}

function calculateConfidence(data: ParsedResumeData): number {
  let score = 0;
  let total = 0;

  // Name (20 points)
  total += 20;
  if (data.name) score += 20;

  // Email (15 points)
  total += 15;
  if (data.email) score += 15;

  // Experience (25 points)
  total += 25;
  if (data.experience.length > 0) score += Math.min(25, data.experience.length * 8);

  // Education (15 points)
  total += 15;
  if (data.education.length > 0) score += Math.min(15, data.education.length * 8);

  // Skills (15 points)
  total += 15;
  if (data.skills.length > 0) score += Math.min(15, data.skills.length * 1.5);

  // Summary (10 points)
  total += 10;
  if (data.summary) score += 10;

  return Math.round((score / total) * 100);
}
