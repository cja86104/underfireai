'use client';

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
  Clock,
  Edit3,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type {
  UserResume,
  ParsedResumeData,
  WorkExperience,
  Education,
} from '@/types/database';

interface ResumePreviewProps {
  resume: UserResume;
  showRawText?: boolean;
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}

interface ResumeHeaderProps {
  parsedData: ParsedResumeData;
  targetRole?: string | null;
  experienceYears?: number | null;
}

interface ExperienceCardProps {
  experience: WorkExperience;
  isLast?: boolean;
}

interface EducationCardProps {
  education: Education;
}

interface SkillsListProps {
  skills: string[];
  maxVisible?: number;
  editable?: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Present';
  
  // Handle various date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // If can't parse, return as-is (might be "2023" or "Jan 2023")
    return dateStr;
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function calculateDuration(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (isNaN(start.getTime())) return '';
  
  const months = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  if (months < 12) {
    return `${months} mo${months !== 1 ? 's' : ''}`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return `${years} yr${years !== 1 ? 's' : ''}`;
  }
  
  return `${years} yr${years !== 1 ? 's' : ''} ${remainingMonths} mo${remainingMonths !== 1 ? 's' : ''}`;
}

function ResumeHeader({ parsedData, targetRole, experienceYears }: ResumeHeaderProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      {/* Name and Contact */}
      <div className="flex items-start justify-between">
        <div>
          {parsedData.name && (
            <h2 className="text-2xl font-bold text-charcoal-900">{parsedData.name}</h2>
          )}
          {targetRole && (
            <p className="text-fire-600 font-medium mt-1">{targetRole}</p>
          )}
        </div>
        {experienceYears !== null && experienceYears !== undefined && (
          <div className="text-right">
            <span className="text-3xl font-bold text-charcoal-900">{experienceYears}</span>
            <p className="text-xs text-charcoal-500">years exp.</p>
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div className="flex flex-wrap gap-4 text-sm text-charcoal-500">
        {parsedData.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            <span>{parsedData.email}</span>
          </div>
        )}
        {parsedData.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-4 w-4" />
            <span>{parsedData.phone}</span>
          </div>
        )}
        {parsedData.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span>{parsedData.location}</span>
          </div>
        )}
      </div>

      {/* Summary */}
      {parsedData.summary && (
        <p className="text-sm text-charcoal-600 leading-relaxed">
          {parsedData.summary}
        </p>
      )}
    </div>
  );
}

function ExperienceCard({ experience, isLast }: ExperienceCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHighlights = experience.highlights && experience.highlights.length > 0;
  const duration = calculateDuration(experience.start_date, experience.end_date);

  return (
    <div className={cn('relative pl-6', !isLast && 'pb-6')}>
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[7px] top-3 bottom-0 w-0.5 bg-stone-200" />
      )}
      
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-fire-500 bg-white" />

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-charcoal-900">{experience.title}</h4>
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-3.5 w-3.5 text-charcoal-400" />
              <span className="text-charcoal-600">{experience.company}</span>
            </div>
          </div>
          <div className="text-right text-sm text-charcoal-500 whitespace-nowrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatDate(experience.start_date)} - {formatDate(experience.end_date)}
              </span>
            </div>
            {duration && (
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{duration}</span>
              </div>
            )}
          </div>
        </div>

        {experience.description && (
          <p className="text-sm text-charcoal-500">{experience.description}</p>
        )}

        {hasHighlights && (
          <>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-fire-600 hover:text-fire-700 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide achievements
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show {experience.highlights.length} achievement{experience.highlights.length !== 1 ? 's' : ''}
                </>
              )}
            </button>

            {isExpanded && (
              <ul className="space-y-1.5 mt-2">
                {experience.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="text-sm text-charcoal-500 flex items-start gap-2"
                  >
                    <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EducationCard({ education }: EducationCardProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
      <div className="rounded-full bg-blue-100 p-2">
        <GraduationCap className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-charcoal-900 text-sm">{education.degree}</h4>
        {education.field && (
          <p className="text-xs text-charcoal-500">{education.field}</p>
        )}
        <p className="text-xs text-charcoal-400 mt-1">
          {education.institution}
          {education.graduation_date && ` • ${formatDate(education.graduation_date)}`}
        </p>
      </div>
    </div>
  );
}

function SkillsList({ skills, maxVisible = 12, editable = false }: SkillsListProps): React.JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const visibleSkills = showAll ? skills : skills.slice(0, maxVisible);
  const hiddenCount = skills.length - maxVisible;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {visibleSkills.map((skill) => (
          <span
            key={skill}
            className={cn(
              'px-2.5 py-1 text-xs rounded-full border',
              'bg-stone-50 border-stone-200 text-charcoal-700',
              editable && 'cursor-pointer hover:border-fire-300 hover:text-fire-600 hover:bg-fire-50 transition-colors'
            )}
          >
            {skill}
          </span>
        ))}
      </div>

      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs text-fire-600 hover:text-fire-700 transition-colors"
        >
          +{hiddenCount} more skills
        </button>
      )}

      {showAll && skills.length > maxVisible && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

export function ResumePreview({
  resume,
  showRawText = false,
  editable = false,
  onEdit,
  className,
}: ResumePreviewProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw'>('parsed');
  const parsedData = resume.parsed_data;

  if (!parsedData) {
    return (
      <div className={cn('rounded-xl border border-stone-200 bg-white p-6 shadow-card', className)}>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-charcoal-300 mx-auto mb-3" />
          <p className="text-charcoal-500">No parsed resume data available</p>
          {resume.raw_text && (
            <p className="text-xs text-charcoal-400 mt-1">Raw text available for review</p>
          )}
        </div>
      </div>
    );
  }

  const hasExperience = parsedData.experience && parsedData.experience.length > 0;
  const hasEducation = parsedData.education && parsedData.education.length > 0;
  const hasSkills = parsedData.skills && parsedData.skills.length > 0;
  const hasCertifications = parsedData.certifications && parsedData.certifications.length > 0;

  return (
    <div className={cn('rounded-xl border border-stone-200 bg-white shadow-card', className)}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 px-6 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-fire-500" />
          <span className="font-medium text-charcoal-900">Resume</span>
        </div>

        <div className="flex items-center gap-2">
          {showRawText && resume.raw_text && (
            <div className="flex rounded-lg bg-stone-100 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('parsed')}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  activeTab === 'parsed'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                )}
              >
                Parsed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  activeTab === 'raw'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                )}
              >
                Raw
              </button>
            </div>
          )}

          {editable && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-fire-600 hover:text-fire-700 hover:bg-fire-50 rounded-lg transition-colors"
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'parsed' ? (
          <div className="space-y-6">
            {/* Header Section */}
            <ResumeHeader
              parsedData={parsedData}
              targetRole={resume.target_role}
              experienceYears={resume.experience_years}
            />

            {/* Skills Section */}
            {hasSkills && (
              <div>
                <h3 className="text-sm font-medium text-charcoal-500 mb-3 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Skills
                </h3>
                <SkillsList skills={parsedData.skills} editable={editable} />
              </div>
            )}

            {/* Experience Section */}
            {hasExperience && (
              <div>
                <h3 className="text-sm font-medium text-charcoal-500 mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Experience
                </h3>
                <div>
                  {parsedData.experience.map((exp, i) => (
                    <ExperienceCard
                      key={`${exp.title}-${exp.company}`}
                      experience={exp}
                      isLast={i === parsedData.experience.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Education Section */}
            {hasEducation && (
              <div>
                <h3 className="text-sm font-medium text-charcoal-500 mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Education
                </h3>
                <div className="space-y-2">
                  {parsedData.education.map((edu) => (
                    <EducationCard key={`${edu.degree}-${edu.institution}`} education={edu} />
                  ))}
                </div>
              </div>
            )}

            {/* Certifications Section */}
            {hasCertifications && (
              <div>
                <h3 className="text-sm font-medium text-charcoal-500 mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certifications
                </h3>
                <div className="flex flex-wrap gap-2">
                  {parsedData.certifications?.map((cert) => (
                    <span
                      key={cert}
                      className="px-3 py-1.5 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-700"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Raw Text View */
          <div className="max-h-96 overflow-y-auto">
            <pre className="text-xs text-charcoal-600 whitespace-pre-wrap font-mono leading-relaxed bg-stone-50 p-4 rounded-lg">
              {resume.raw_text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact resume card for lists and selections
 */
export function ResumeCard({
  resume,
  selected = false,
  onSelect,
  className,
}: {
  resume: UserResume;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}): React.JSX.Element {
  const parsedData = resume.parsed_data;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={cn(
        'w-full text-left rounded-lg border p-4 transition-all',
        selected
          ? 'border-fire-500 bg-fire-50 shadow-glow-fire'
          : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-md',
        !onSelect && 'cursor-default',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-full p-2',
              selected ? 'bg-fire-500' : 'bg-stone-100'
            )}
          >
            <User
              className={cn(
                'h-4 w-4',
                selected ? 'text-white' : 'text-charcoal-500'
              )}
            />
          </div>
          <div>
            <h4 className="font-medium text-charcoal-900">
              {parsedData?.name ?? 'Unnamed Resume'}
            </h4>
            {resume.target_role && (
              <p className="text-xs text-charcoal-500">{resume.target_role}</p>
            )}
          </div>
        </div>

        {resume.experience_years !== null && (
          <div className="text-right">
            <span className="text-lg font-bold text-charcoal-900">
              {resume.experience_years}
            </span>
            <p className="text-xs text-charcoal-400">yrs</p>
          </div>
        )}
      </div>

      {resume.skills && resume.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {resume.skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 text-xs rounded bg-stone-100 text-charcoal-600"
            >
              {skill}
            </span>
          ))}
          {resume.skills.length > 5 && (
            <span className="px-2 py-0.5 text-xs rounded bg-stone-100 text-charcoal-400">
              +{resume.skills.length - 5}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
