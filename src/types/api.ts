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
  coach_name: string | null;
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
  coach_name: string | null;
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

export type PlanEnrollmentStatus = "active" | "completed" | "cancelled";

export interface PlanEnrollment {
  id: number;
  plan_id: number;
  athlete_id: number;
  coach_subscription_id: number | null;
  assigned_by_coach: boolean;
  status: PlanEnrollmentStatus;
  enrolled_at: string;
  plan?: PlanListItem;
}

// === Records ===

export type RecordType =
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

export type CoachSubscriptionStatus = "pending" | "active" | "cancelled" | "expired";

export interface CoachProfile {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  athlete_count: number;
  plan_count: number;
  xp_per_month: number;
  subscription_status: CoachSubscriptionStatus | null;
  subscription_initiated_by: "coach" | "athlete" | null;
}

export interface CoachSubscription {
  id: number;
  athlete_id: number;
  athlete: User;
  status: CoachSubscriptionStatus;
  xp_per_month: number;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CoachRequest {
  id: number;
  athlete: User;
  xp_per_month: number;
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
  | "manual"
  | "subscription_payment"
  | "event_registration"
  | "product_redemption";

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

// === Divisions / Leagues ===

export type Division =
  | "bronce"
  | "plata"
  | "oro"
  | "platino"
  | "diamante"
  | "elite";

export interface LeagueStanding {
  user_id: number;
  name: string;
  avatar_url: string | null;
  weekly_xp: number;
  rank: number;
  promoted: boolean;
  demoted: boolean;
  is_current_user: boolean;
}

export interface CurrentDivision {
  division: Division;
  division_display: string;
  division_order: number;
  total_divisions: number;
  weekly_xp: number;
  days_remaining: number;
  week_start: string;
  week_end: string;
  group_number: number;
  total_groups: number;
  standings: LeagueStanding[];
  promote_count: number;
  demote_count: number;
}

export interface WeekHistory {
  week_start: string;
  week_end: string;
  division: Division;
  division_display: string;
  weekly_xp: number;
  final_rank: number | null;
  promoted: boolean;
  demoted: boolean;
  group_size: number;
}

// === Training Centers ===

export type CenterMemberRole = "member" | "coach" | "admin";
export type CenterMemberStatus = "pending" | "active" | "rejected" | "cancelled";
export type CenterSubscriptionStatus = "pending" | "active" | "cancelled" | "expired";
export type ClassStatus = "scheduled" | "completed" | "cancelled";
export type ClassBookingStatus = "reserved" | "attended" | "cancelled";

export interface TrainingCenter {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  owner_id: number;
  owner_name: string;
  is_active: boolean;
  monthly_xp: number;
  member_count: number;
  created_at: string;
}

export interface TrainingCenterListItem {
  id: number;
  name: string;
  city: string | null;
  logo_url: string | null;
  monthly_xp: number;
  member_count: number;
  is_active: boolean;
}

export interface CenterMembership {
  id: number;
  center_id: number;
  user_id: number;
  user_name: string;
  role: CenterMemberRole;
  status: CenterMemberStatus;
  created_at: string;
}

export interface MyCenterMembership {
  id: number;
  center_id: number;
  center_name: string;
  role: CenterMemberRole;
  status: CenterMemberStatus;
  created_at: string;
}

export interface CenterPlan {
  id: number;
  center_id: number;
  plan_id: number;
  plan_name: string;
  coach_name: string;
  published_at: string;
}

export interface CenterSubscription {
  id: number;
  center_id: number;
  center_name: string;
  athlete_id: number;
  athlete_name: string;
  status: CenterSubscriptionStatus;
  xp_per_month: number;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CenterClass {
  id: number;
  center_id: number;
  coach_id: number;
  coach_name: string;
  name: string;
  description: string | null;
  scheduled_at: string;
  duration_min: number | null;
  max_capacity: number | null;
  template_id: number | null;
  status: ClassStatus;
  booking_count: number;
  created_at: string;
}

export interface ClassBooking {
  id: number;
  class_id: number;
  athlete_id: number;
  athlete_name: string;
  status: ClassBookingStatus;
  booked_at: string;
}

// === Partner Companies ===

export interface PartnerCompany {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
}

export interface PartnerCompanyListItem {
  id: number;
  name: string;
  logo_url: string | null;
  product_count: number;
  is_active: boolean;
}

export interface Product {
  id: number;
  company_id: number;
  company_name: string;
  name: string;
  description: string | null;
  item_type: "product" | "discount";
  xp_cost: number | null;
  discount_pct: number | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  external_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductRedemptionResult {
  message: string;
  product_id: number;
  xp_spent: number;
  external_url: string | null;
}

// === Events ===

export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "registered" | "cancelled" | "attended";

export type EventType = "competition" | "workshop" | "exhibition" | "social" | "open_day" | "seminar" | "other";

export interface AppEvent {
  id: number;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  status: EventStatus;
  event_type: EventType;
  is_public: boolean;
  xp_cost: number | null;
  center_id: number | null;
  company_id: number | null;
  center_name: string | null;
  company_name: string | null;
  registered_count: number;
  is_registered: boolean;
  created_at: string;
}

export interface EventListItem {
  id: number;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  status: EventStatus;
  event_type: EventType;
  xp_cost: number | null;
  center_name: string | null;
  company_name: string | null;
  registered_count: number;
  is_registered: boolean;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  user_id: number;
  user_name: string;
  status: RegistrationStatus;
  registered_at: string;
}

export interface EventCollaborator {
  id: number;
  event_id: number;
  company_id: number | null;
  company_name: string | null;
  center_id: number | null;
  center_name: string | null;
  created_at: string;
}

// === Dashboard ===

export interface DashboardSummary {
  training: {
    total_sessions: number;
    total_volume_kg: number;
    total_sets: number;
    total_time_sec: number;
    distinct_exercises: number;
    avg_rpe: number | null;
  };
  recent_sessions: {
    id: number;
    started_at: string;
    finished_at: string | null;
    total_duration_sec: number | null;
    exercise_count: number;
    set_count: number;
    rpe: number | null;
  }[];
  session_dates: { date: string; count: number }[];
  upcoming_events: {
    id: number;
    name: string;
    event_date: string;
    end_date: string | null;
    location: string | null;
    event_type: EventType;
  }[];
  xp: {
    total_xp: number;
    level: number;
    xp_progress: number;
    xp_needed: number;
    progress_pct: number;
  };
  league: {
    division: string;
    division_display: string;
    weekly_xp: number;
    rank: number;
    group_size: number;
    days_remaining: number;
  } | null;
  records: {
    id: number;
    exercise_id: number;
    record_type: string;
    value: number;
    achieved_at: string;
  }[];
  streak: number;
}
