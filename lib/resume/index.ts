export {
  parsePDF,
  parseText,
  type ParseResult,
} from './parser';

export {
  extractSkills,
  analyzeSkillsForRole,
  generateInterviewTopics,
  matchSkillsToRequirements,
  type ExtractedSkills,
  type SkillAnalysis,
} from './skill-extractor';

export {
  analyzeResumeAlignment,
  type AlignmentAnalysis,
  type AlignmentDiscrepancy,
  type AlignmentConfirmation,
  type ResumeSuggestion as AlignmentSuggestion,
} from './alignment-analyzer';

export {
  scanResumeVulnerabilities,
  scanSpecificClaim,
  getTopVulnerabilityQuestions,
  type VulnerabilityScan,
  type ResumeVulnerability,
  type VulnerabilityCategory,
  type PracticeTopic,
} from './vulnerability-scanner';

export {
  generateResumeSuggestions,
  generateSessionSuggestions,
  aggregateSuggestions,
  type ResumeSuggestion,
  type ResumeSection,
  type SuggestionBatch,
} from './suggestion-generator';

export {
  getActiveResume,
  generateAndSaveAlignmentAnalysis,
  generateAndSaveVulnerabilityScan,
  generateAndSaveSuggestions,
  getUserInsights,
  getSessionInsight,
  getLatestVulnerabilityScan,
  calculateResumeHealthScore,
  type ResumeInsight,
} from './insights-service';

export {
  getResumeVulnerabilitiesForInterview,
  getJdGapsForInterview,
  buildResumeTargetingPrompt,
  saveInterviewResumeContext,
  type ResumeInterviewContext,
} from './interview-context';
