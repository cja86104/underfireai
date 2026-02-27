import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

// Derive the Supabase client type from the local factory so we don't depend on
// @supabase/supabase-js directly at the type level.
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ============================================
// BADGE CATALOG
// Must stay in sync with BadgeGrid component's
// ICON_MAP and TIER_CONFIG keys.
// ============================================

export interface BadgeCatalogEntry {
  id: string;
  name: string;
  description: string;
  icon: string;           // key in BadgeGrid ICON_MAP
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'streak' | 'performance' | 'milestone' | 'special';
  requirement: string;    // human-readable
}

export const BADGE_CATALOG: BadgeCatalogEntry[] = [
  // ---- Milestone badges ----
  {
    id: 'first_interview',
    name: 'First Step',
    description: 'Completed your first mock interview.',
    icon: 'target',
    tier: 'bronze',
    category: 'milestone',
    requirement: 'Complete 1 interview.',
  },
  {
    id: 'sessions_5',
    name: 'Getting Warm',
    description: 'Five interviews done. The nerves are fading.',
    icon: 'flame',
    tier: 'bronze',
    category: 'milestone',
    requirement: 'Complete 5 interviews.',
  },
  {
    id: 'sessions_10',
    name: 'In the Groove',
    description: 'Ten interviews in. You\'re building real momentum.',
    icon: 'rocket',
    tier: 'silver',
    category: 'milestone',
    requirement: 'Complete 10 interviews.',
  },
  {
    id: 'sessions_25',
    name: 'Battle-Tested',
    description: '25 interviews. You\'ve seen it all.',
    icon: 'shield',
    tier: 'gold',
    category: 'milestone',
    requirement: 'Complete 25 interviews.',
  },
  {
    id: 'sessions_50',
    name: 'Unstoppable',
    description: '50 interviews. Legendary commitment.',
    icon: 'crown',
    tier: 'platinum',
    category: 'milestone',
    requirement: 'Complete 50 interviews.',
  },

  // ---- Performance badges ----
  {
    id: 'score_60',
    name: 'Solid Foundation',
    description: 'Scored 60% or higher in a session.',
    icon: 'check',
    tier: 'bronze',
    category: 'performance',
    requirement: 'Achieve an overall score of 60% or higher.',
  },
  {
    id: 'score_75',
    name: 'Sharp Answers',
    description: 'Scored 75% or higher in a session.',
    icon: 'star',
    tier: 'silver',
    category: 'performance',
    requirement: 'Achieve an overall score of 75% or higher.',
  },
  {
    id: 'score_85',
    name: 'Elite Performer',
    description: 'Scored 85% or higher. You\'re standing out.',
    icon: 'award',
    tier: 'gold',
    category: 'performance',
    requirement: 'Achieve an overall score of 85% or higher.',
  },
  {
    id: 'score_95',
    name: 'Perfect Round',
    description: 'Scored 95% or higher. Virtually flawless.',
    icon: 'trophy',
    tier: 'platinum',
    category: 'performance',
    requirement: 'Achieve an overall score of 95% or higher.',
  },
  {
    id: 'avg_score_75',
    name: 'Consistently Good',
    description: 'Maintained a 75% average score across all sessions.',
    icon: 'trending',
    tier: 'silver',
    category: 'performance',
    requirement: 'Reach a 75% average overall score.',
  },
  {
    id: 'avg_score_85',
    name: 'Top Tier Average',
    description: 'Maintained an 85% average across all sessions.',
    icon: 'medal',
    tier: 'gold',
    category: 'performance',
    requirement: 'Reach an 85% average overall score.',
  },

  // ---- Streak badges ----
  {
    id: 'streak_3',
    name: 'On a Roll',
    description: 'Practiced 3 days in a row.',
    icon: 'flame',
    tier: 'bronze',
    category: 'streak',
    requirement: 'Practice on 3 consecutive days.',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'A full week of daily practice.',
    icon: 'zap',
    tier: 'silver',
    category: 'streak',
    requirement: 'Practice on 7 consecutive days.',
  },
  {
    id: 'streak_14',
    name: 'Fortnight Focus',
    description: 'Two straight weeks. You\'re serious about this.',
    icon: 'zap',
    tier: 'gold',
    category: 'streak',
    requirement: 'Practice on 14 consecutive days.',
  },
  {
    id: 'streak_30',
    name: 'Monthly Grind',
    description: '30 days straight. Absolute dedication.',
    icon: 'crown',
    tier: 'platinum',
    category: 'streak',
    requirement: 'Practice on 30 consecutive days.',
  },

  // ---- Hours badges ----
  {
    id: 'hours_1',
    name: 'First Hour',
    description: 'Put in your first hour of practice.',
    icon: 'clock',
    tier: 'bronze',
    category: 'milestone',
    requirement: 'Accumulate 1 hour of practice time.',
  },
  {
    id: 'hours_5',
    name: 'Invested',
    description: '5 hours of practice time logged.',
    icon: 'clock',
    tier: 'silver',
    category: 'milestone',
    requirement: 'Accumulate 5 hours of practice time.',
  },
  {
    id: 'hours_10',
    name: 'Dedicated',
    description: '10 hours in. The preparation is showing.',
    icon: 'clock',
    tier: 'gold',
    category: 'milestone',
    requirement: 'Accumulate 10 hours of practice time.',
  },
  {
    id: 'hours_25',
    name: 'Marathon Prep',
    description: '25 hours of deliberate practice.',
    icon: 'heart',
    tier: 'platinum',
    category: 'milestone',
    requirement: 'Accumulate 25 hours of practice time.',
  },
];

// ============================================
// BADGE STORED TYPE (what goes in user_progress.badges)
// ============================================

export interface StoredBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'streak' | 'performance' | 'milestone' | 'special';
  requirement: string;
  earned_at: string; // ISO timestamp
}

// ============================================
// PROGRESS SNAPSHOT — what we need to evaluate badges
// ============================================

export interface ProgressSnapshot {
  total_sessions: number;
  total_hours: number;
  current_streak: number;
  avg_score: number | null;
  // The score from the session that just completed
  latest_session_score: number | null;
}

// ============================================
// BADGE EVALUATION
// Returns the IDs of any newly earned badges
// given the current progress snapshot and the
// set of badges the user already holds.
// ============================================

function evaluateBadges(
  snapshot: ProgressSnapshot,
  alreadyEarned: Set<string>
): BadgeCatalogEntry[] {
  const newlyEarned: BadgeCatalogEntry[] = [];

  const check = (id: string, condition: boolean): void => {
    if (condition && !alreadyEarned.has(id)) {
      const entry = BADGE_CATALOG.find((b) => b.id === id);
      if (entry) newlyEarned.push(entry);
    }
  };

  // Milestone — sessions
  check('first_interview', snapshot.total_sessions >= 1);
  check('sessions_5',      snapshot.total_sessions >= 5);
  check('sessions_10',     snapshot.total_sessions >= 10);
  check('sessions_25',     snapshot.total_sessions >= 25);
  check('sessions_50',     snapshot.total_sessions >= 50);

  // Milestone — hours
  check('hours_1',  snapshot.total_hours >= 1);
  check('hours_5',  snapshot.total_hours >= 5);
  check('hours_10', snapshot.total_hours >= 10);
  check('hours_25', snapshot.total_hours >= 25);

  // Streak
  check('streak_3',  snapshot.current_streak >= 3);
  check('streak_7',  snapshot.current_streak >= 7);
  check('streak_14', snapshot.current_streak >= 14);
  check('streak_30', snapshot.current_streak >= 30);

  // Performance — single session score
  if (snapshot.latest_session_score !== null) {
    check('score_60', snapshot.latest_session_score >= 60);
    check('score_75', snapshot.latest_session_score >= 75);
    check('score_85', snapshot.latest_session_score >= 85);
    check('score_95', snapshot.latest_session_score >= 95);
  }

  // Performance — average score
  if (snapshot.avg_score !== null) {
    check('avg_score_75', snapshot.avg_score >= 75);
    check('avg_score_85', snapshot.avg_score >= 85);
  }

  return newlyEarned;
}

// ============================================
// MAIN EXPORT — updateProgressAndAwardBadges
// Call this AFTER session_scores has been saved.
// Returns any newly awarded badges.
// ============================================

export async function updateProgressAndAwardBadges(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  latestSessionScore: number | null
): Promise<StoredBadge[]> {
  // ---- 1. Fetch current progress row ----
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (progressError) {
    console.error('[badge-service] Error fetching user_progress:', progressError);
    return [];
  }

  if (!progress) {
    console.error('[badge-service] No user_progress row for user:', userId);
    return [];
  }

  // ---- 2. Recalculate avg_score now that session_scores is saved ----
  const { data: avgResult, error: avgError } = await supabase
    .from('session_scores')
    .select('overall_score, interview_sessions!inner(user_id)')
    .eq('interview_sessions.user_id', userId)
    .not('overall_score', 'is', null);

  let recalculatedAvg: number | null = null;
  if (!avgError && avgResult && avgResult.length > 0) {
    const total = avgResult.reduce(
      (sum: number, row: { overall_score: number | null }) => sum + (row.overall_score ?? 0),
      0
    );
    recalculatedAvg = Math.round(total / avgResult.length);
  }

  // ---- 3. Update user_progress with correct avg_score ----
  // The DB trigger already updated total_sessions, total_hours, streak.
  // We only need to fix avg_score here since the trigger ran before scores were saved.
  const { error: updateAvgError } = await supabase
    .from('user_progress')
    .update({ avg_score: recalculatedAvg })
    .eq('user_id', userId);

  if (updateAvgError) {
    console.error('[badge-service] Error updating avg_score:', updateAvgError);
    // Non-fatal — continue to badge evaluation
  }

  // ---- 4. Build updated snapshot for badge evaluation ----
  const snapshot: ProgressSnapshot = {
    total_sessions: progress.total_sessions,
    total_hours: progress.total_hours,
    current_streak: progress.current_streak,
    avg_score: recalculatedAvg,
    latest_session_score: latestSessionScore,
  };

  // ---- 5. Get existing badges ----
  const existingBadges = (progress.badges as StoredBadge[] | null) ?? [];
  const alreadyEarned = new Set(existingBadges.map((b) => b.id));

  // ---- 6. Evaluate new badges ----
  const newEntries = evaluateBadges(snapshot, alreadyEarned);

  if (newEntries.length === 0) {
    return [];
  }

  // ---- 7. Persist newly earned badges ----
  const now = new Date().toISOString();
  const newStoredBadges: StoredBadge[] = newEntries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    icon: entry.icon,
    tier: entry.tier,
    category: entry.category,
    requirement: entry.requirement,
    earned_at: now,
  }));

  const updatedBadges = [...existingBadges, ...newStoredBadges];

  const { error: badgeError } = await supabase
    .from('user_progress')
    .update({ badges: updatedBadges as unknown as Json })
    .eq('user_id', userId);

  if (badgeError) {
    console.error('[badge-service] Error saving badges:', badgeError);
    return [];
  }

  return newStoredBadges;
}

// ============================================
// HELPER — build the full badge list for the UI
// Merges catalog (all badges) with earned data
// so the progress page can show locked badges too.
// ============================================

export function buildFullBadgeList(earnedBadges: StoredBadge[]): (BadgeCatalogEntry & {
  earnedAt: string | null;
  progress: number;
})[] {
  const earnedMap = new Map(earnedBadges.map((b) => [b.id, b]));

  return BADGE_CATALOG.map((entry) => {
    const earned = earnedMap.get(entry.id);
    return {
      ...entry,
      earnedAt: earned?.earned_at ?? null,
      progress: 0, // progress is calculated client-side if needed
    };
  });
}
