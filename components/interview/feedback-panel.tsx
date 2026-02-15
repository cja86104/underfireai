'use client';

import { useState } from 'react';
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Zap,
  RotateCcw,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Clock,
  Star,
  ArrowRight,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type ScoringKeyMoment,
  type DetailedFeedback,
  type FeedbackSection,
  type Recommendation,
  getScoreBenchmark,
} from '@/types/scoring';

interface FeedbackPanelProps {
  interviewerImpression: string;
  interviewerName?: string;
  strengths: string[];
  improvements: string[];
  keyMoments?: ScoringKeyMoment[];
  detailedFeedback?: DetailedFeedback;
  recommendations?: Recommendation[];
  className?: string;
}

interface KeyMomentCardProps {
  moment: ScoringKeyMoment;
  index: number;
}

interface FeedbackSectionCardProps {
  title: string;
  section: FeedbackSection;
  icon: typeof MessageSquare;
  defaultExpanded?: boolean;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const MOMENT_CONFIG: Record<
  ScoringKeyMoment['type'],
  { icon: typeof TrendingUp; color: string; bgColor: string; label: string }
> = {
  strong: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Strong Moment',
  },
  weak: {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Needs Improvement',
  },
  turning_point: {
    icon: Zap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    label: 'Turning Point',
  },
  recovery: {
    icon: RotateCcw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Recovery',
  },
  missed_opportunity: {
    icon: Target,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'Missed Opportunity',
  },
};

const PRIORITY_CONFIG: Record<
  Recommendation['priority'],
  { color: string; bgColor: string; label: string }
> = {
  high: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'High Priority',
  },
  medium: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    label: 'Medium Priority',
  },
  low: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Low Priority',
  },
};

function KeyMomentCard({ moment, index }: KeyMomentCardProps): React.JSX.Element {
  const config = MOMENT_CONFIG[moment.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors hover:shadow-md',
        config.bgColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={cn(
              'rounded-full p-2 bg-white shadow-sm',
              config.color
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-sm font-medium', config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-charcoal-400">
              Response #{index + 1}
            </span>
            {moment.impact !== 0 && (
              <span
                className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded',
                  moment.impact > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                {moment.impact > 0 ? '+' : ''}{moment.impact}
              </span>
            )}
          </div>
          <p className="text-sm text-charcoal-700">{moment.description}</p>
          {moment.quote && (
            <div className="mt-2 flex items-start gap-2 text-xs text-charcoal-500 italic">
              <Quote className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>&quot;{moment.quote}&quot;</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackSectionCard({
  title,
  section,
  icon: Icon,
  defaultExpanded = false,
}: FeedbackSectionCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const benchmark = getScoreBenchmark(section.score);

  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-charcoal-400" />
          <span className="font-medium text-charcoal-900">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-bold"
            style={{ color: benchmark.color }}
          >
            {section.score}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-charcoal-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-charcoal-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-charcoal-600">{section.summary}</p>

          {section.highlights.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Highlights
              </h4>
              <ul className="space-y-1">
                {section.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="text-sm text-charcoal-500 flex items-start gap-2"
                  >
                    <span className="text-green-500 mt-1">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.improvements.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Areas for Improvement
              </h4>
              <ul className="space-y-1">
                {section.improvements.map((improvement) => (
                  <li
                    key={improvement}
                    className="text-sm text-charcoal-500 flex items-start gap-2"
                  >
                    <span className="text-amber-500 mt-1">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ recommendation }: RecommendationCardProps): React.JSX.Element {
  const [showExercise, setShowExercise] = useState(false);
  const config = PRIORITY_CONFIG[recommendation.priority];

  return (
    <div className={cn('rounded-lg border p-4', config.bgColor)}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Lightbulb className={cn('h-5 w-5', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-charcoal-500">{recommendation.category}</span>
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded bg-white/50', config.color)}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-charcoal-700">{recommendation.recommendation}</p>

          {recommendation.practiceExercise && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowExercise(!showExercise)}
                className="text-xs text-fire-600 hover:text-fire-700 flex items-center gap-1 transition-colors"
              >
                <ArrowRight className={cn('h-3 w-3 transition-transform', showExercise && 'rotate-90')} />
                Practice Exercise
              </button>
              {showExercise && (
                <div className="mt-2 p-3 rounded-lg bg-white/70 text-xs text-charcoal-600">
                  {recommendation.practiceExercise}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeedbackPanel({
  interviewerImpression,
  interviewerName = 'The interviewer',
  strengths,
  improvements,
  keyMoments,
  detailedFeedback,
  recommendations,
  className,
}: FeedbackPanelProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'moments' | 'detailed' | 'recommendations'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', show: true },
    { id: 'moments' as const, label: 'Key Moments', show: keyMoments && keyMoments.length > 0 },
    { id: 'detailed' as const, label: 'Detailed Feedback', show: !!detailedFeedback },
    { id: 'recommendations' as const, label: 'Recommendations', show: recommendations && recommendations.length > 0 },
  ].filter((tab) => tab.show);

  return (
    <div className={cn('rounded-xl border border-stone-200 bg-white shadow-card', className)}>
      {/* Tab Navigation */}
      {tabs.length > 1 && (
        <div className="flex border-b border-stone-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'text-fire-600 border-b-2 border-fire-500'
                  : 'text-charcoal-500 hover:text-charcoal-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Interviewer Impression */}
            <div className="rounded-lg border border-fire-200 bg-fire-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-fire-500 p-2 shadow-glow-fire">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-charcoal-500 mb-2">
                    {interviewerName}&apos;s Impression
                  </h3>
                  <p className="text-charcoal-700 leading-relaxed">
                    {interviewerImpression}
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths & Improvements Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h3 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  What You Did Well
                </h3>
                <ul className="space-y-2">
                  {strengths.map((strength) => (
                    <li
                      key={strength}
                      className="text-sm text-charcoal-700 flex items-start gap-2"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-medium text-amber-700 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Areas to Develop
                </h3>
                <ul className="space-y-2">
                  {improvements.map((improvement) => (
                    <li
                      key={improvement}
                      className="text-sm text-charcoal-700 flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Key Moments Tab */}
        {activeTab === 'moments' && keyMoments && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-charcoal-500 mb-4">
              <Clock className="h-4 w-4" />
              <span>{keyMoments.length} key moments identified</span>
            </div>
            {keyMoments.map((moment) => (
              <KeyMomentCard key={moment.messageIndex} moment={moment} index={moment.messageIndex} />
            ))}
          </div>
        )}

        {/* Detailed Feedback Tab */}
        {activeTab === 'detailed' && detailedFeedback && (
          <div className="space-y-3">
            <FeedbackSectionCard
              title="Opening"
              section={detailedFeedback.opening}
              icon={MessageSquare}
              defaultExpanded
            />
            <FeedbackSectionCard
              title="Body of Answers"
              section={detailedFeedback.bodyAnswers}
              icon={MessageSquare}
            />
            <FeedbackSectionCard
              title="Technical Responses"
              section={detailedFeedback.technicalResponses}
              icon={Lightbulb}
            />
            <FeedbackSectionCard
              title="Behavioral Responses"
              section={detailedFeedback.behavioralResponses}
              icon={Star}
            />
            <FeedbackSectionCard
              title="Closing"
              section={detailedFeedback.closing}
              icon={MessageSquare}
            />
            <FeedbackSectionCard
              title="Overall Presentation"
              section={detailedFeedback.overallPresentation}
              icon={Target}
            />
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && recommendations && (
          <div className="space-y-4">
            <p className="text-sm text-charcoal-500 mb-4">
              Personalized recommendations to improve your interview performance:
            </p>
            {recommendations
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return order[a.priority] - order[b.priority];
              })
              .map((rec) => (
                <RecommendationCard key={rec.recommendation} recommendation={rec} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact feedback summary for use in lists or cards
 */
export function FeedbackSummary({
  interviewerImpression,
  strengths,
  improvements,
  className,
}: {
  interviewerImpression: string;
  strengths: string[];
  improvements: string[];
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-charcoal-600 italic">
        &quot;{interviewerImpression.slice(0, 200)}
        {interviewerImpression.length > 200 ? '...' : ''}&quot;
      </p>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>{strengths.length} strengths</span>
        </div>
        <div className="flex items-center gap-1 text-amber-600">
          <AlertCircle className="h-3 w-3" />
          <span>{improvements.length} areas to improve</span>
        </div>
      </div>
    </div>
  );
}
