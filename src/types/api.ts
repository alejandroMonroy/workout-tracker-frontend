// === User ===

export type UserRole = "athlete" | "coach" | "admin";
export type UnitsPreference = "metric" | "imperial";

export type SexType = "male" | "female" | "other";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  units_preference: UnitsPreference;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex: SexType | null;
  total_xp: number;
  level: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

// === Exercise ===

export type ExerciseType =
  | "strength"
  | "cardio"
  | "gymnastics"
  | "olympic"
  | "other";

export interface Exercise {
  id: number;
  name: string;
  type: ExerciseType;
  muscle_groups: string[] | null;
  equipment: string | null;
  description: string | null;
  is_global: boolean;
  created_by: number | null;
}

// === Template ===

export type WorkoutModality =
  | "amrap"
  | "emom"
  | "for_time"
  | "tabata"
  | "custom";

export interface TemplateBlock {
  id: number;
  exercise_id: number;
  exercise?: Exercise;
  order: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_distance_m: number | null;
  target_duration_sec: number | null;
  rest_sec: number | null;
  notes: string | null;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  description: string | null;
  modality: WorkoutModality;
  rounds: number | null;
  time_cap_sec: number | null;
  is_public: boolean;
  created_by: number;
  assigned_by: number | null;
  blocks: TemplateBlock[];
}

// === Session ===

export interface SessionSet {
  id: number;
  session_id: number;
  exercise_id: number;
  exercise?: Exercise;
  set_number: number;
  sets_count: number | null;
  reps: number | null;
  weight_kg: number | null;
  distance_m: number | null;
  duration_sec: number | null;
  calories: number | null;
  rpe: number | null;
  notes: string | null;
}

export interface WorkoutSession {
  id: number;
  user_id: number;
  template_id: number | null;
  plan_session_id: number | null;
  started_at: string;
  finished_at: string | null;
  total_duration_sec: number | null;
  notes: string | null;
  rpe: number | null;
  mood: string | null;
  sets: SessionSet[];
}

export interface SessionListItem {
  id: number;
  user_id: number;
  template_id: number | null;
  plan_session_id: number | null;
  started_at: string;
  finished_at: string | null;
  total_duration_sec: number | null;
  notes: string | null;
  rpe: number | null;
  mood: string | null;
  set_count: number;
  exercise_count: number;
  has_records: boolean;
}

// === Plan ===

export type BlockType =
  | "warmup"
  | "skill"
  | "strength"
  | "wod"
  | "cardio"
  | "cooldown"
  | "other";

export type SubscriptionStatus = "active" | "cancelled" | "expired";

export interface BlockExercise {
  id: number;
  exercise_id: number;
  exercise?: Exercise;
  order: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_distance_m: number | null;
  target_duration_sec: number | null;
  rest_sec: number | null;
  notes: string | null;
}

export interface SessionBlock {
  id: number;
  name: string;
  block_type: BlockType;
  modality: WorkoutModality | null;
  rounds: number | null;
  time_cap_sec: number | null;
  work_sec: number | null;
  rest_sec: number | null;
  order: number;
  exercises: BlockExercise[];
}

export interface PlanSession {
  id: number;
  plan_id: number;
  name: string;
  description: string | null;
  day_number: number;
  blocks: SessionBlock[];
}

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  is_public: boolean;
  created_by: number;
  created_at: string;
  sessions: PlanSession[];
}

export interface PlanListItem {
  id: number;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  is_public: boolean;
  created_by: number;
  created_at: string;
  session_count: number;
}

export interface Subscription {
  id: number;
  plan_id: number;
  athlete_id: number;
  status: SubscriptionStatus;
  subscribed_at: string;
  plan?: PlanListItem;
}

// === Records ===

export type RecordType =
  | "1rm"
  | "max_reps"
  | "best_time"
  | "max_distance"
  | "max_weight";

export interface PersonalRecord {
  id: number;
  user_id: number;
  exercise_id: number;
  exercise?: Exercise;
  record_type: RecordType;
  value: number;
  achieved_at: string;
  session_id: number | null;
}

// === Coach ===

export interface CoachInvite {
  invite_id: number;
  coach: User;
  created_at: string;
}

// === Stats ===

export interface TimelinePoint {
  date: string;
  volume: number;
  duration_min: number;
  sets: number;
  exercises: number;
  rpe: number | null;
}

export interface ProgressPoint {
  date: string;
  max_weight: number | null;
  estimated_1rm: number | null;
  volume: number;
  max_reps: number | null;
  max_distance: number | null;
  total_sets: number;
}

export interface TrainingSummary {
  period: string;
  total_sessions: number;
  total_volume_kg: number;
  total_sets: number;
  total_time_sec: number;
  distinct_exercises: number;
  muscle_distribution: Record<string, number>;
  avg_rpe: number | null;
}

// === XP / Gamification ===

export type XPReason =
  | "session_complete"
  | "personal_record"
  | "streak_bonus"
  | "first_session"
  | "exercise_variety"
  | "long_session"
  | "high_volume"
  | "consistency"
  | "manual";

export interface XPTransaction {
  id: number;
  amount: number;
  reason: XPReason;
  description: string | null;
  session_id: number | null;
  created_at: string;
}

export interface XPSummary {
  total_xp: number;
  level: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
  xp_needed: number;
  progress_pct: number;
  rank: number;
  total_users: number;
}

export interface LeaderboardEntry {
  user_id: number;
  name: string;
  total_xp: number;
  level: number;
  rank: number;
  avatar_url: string | null;
}
