/**
 * Job Description Analysis Module
 */

export {
  parseJobDescription,
  extractInterviewFocusAreas,
  type ParsedJobDescription,
  type ExperienceRequirements,
  type EducationRequirements,
} from './parser';

export {
  analyzeGaps,
  generatePracticeTopics,
  generatePracticeConfig,
  type GapAnalysis,
  type NarrativeGap,
} from './gap-analyzer';
