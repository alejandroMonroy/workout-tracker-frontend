// === User ===

export type UserRole = "athlete" | "coach" | "admin" | "gym";
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

export type SessionType = "manual" | "class";

export interface WorkoutSession {
  id: number;
  user_id: number;
  template_id: number | null;
  plan_workout_id: number | null;
  class_schedule_id: number | null;
  session_type: SessionType;
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
  plan_workout_id: number | null;
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

export interface CoachPublic {
  id: number;
  name: string;
  avatar_url: string | null;
  subscription_xp_price: number | null;
  plan_count: number;
  subscriber_count: number;
  is_subscribed: boolean;
}

export interface CoachSubscriptionInfo {
  id: number;
  coach_id: number;
  coach_name: string;
  coach_avatar_url: string | null;
  xp_per_month: number;
  subscribed_at: string;
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

export interface GymProduct {
  id: number;
  gym_id: number;
  gym_name: string;
  name: string;
  description: string | null;
  item_type: "product" | "discount";
  xp_cost: number | null;
  discount_pct: number | null;
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

// === Athletes / Friends ===

export type FriendshipStatus = "pending_sent" | "pending_received" | "accepted";

export interface AthletePublic {
  id: number;
  name: string;
  avatar_url: string | null;
  level: number;
  total_xp: number;
  current_division: string | null;
  friendship_id: number | null;
  friendship_status: FriendshipStatus | null;
}

export interface RecordPublic {
  id: number;
  exercise_id: number;
  exercise_name: string;
  record_type: string;
  value: number;
  achieved_at: string;
}

export interface RecentSessionPublic {
  id: number;
  started_at: string;
  finished_at: string | null;
  total_duration_sec: number | null;
  exercise_count: number;
  set_count: number;
}

export interface AthleteProfile extends AthletePublic {
  sessions_30d: number;
  total_sessions: number;
  records: RecordPublic[];
  recent_sessions: RecentSessionPublic[];
}

export interface FriendshipResponse {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: "pending" | "accepted";
  created_at: string;
  other_user: AthletePublic;
}

// === Gym ===

export type PlanType = "monthly" | "annual" | "tickets";
export type MembershipStatus = "active" | "frozen" | "cancelled" | "expired" | "trial";
export type GymBookingStatus = "confirmed" | "cancelled" | "attended" | "no_show";

export interface GymPublic {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  cancellation_hours: number;
  free_trial_enabled: boolean;
  created_at: string;
}

export interface GymLocation {
  id: number;
  gym_id: number;
  name: string;
  address: string | null;
  city: string | null;
  capacity: number;
  is_active: boolean;
}

export interface GymPlan {
  id: number;
  gym_id: number;
  name: string;
  plan_type: PlanType;
  xp_price: number;
  sessions_included: number | null;
  ticket_count: number | null;
  is_active: boolean;
}

export interface GymMembership {
  id: number;
  gym_id: number;
  user_id: number;
  plan_id: number | null;
  status: MembershipStatus;
  tickets_remaining: number | null;
  sessions_used_this_period: number;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  is_trial: boolean;
  gym_name: string | null;
  plan_name: string | null;
  plan_type: PlanType | null;
  sessions_included: number | null;
}

export interface GymMember {
  membership_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  avatar_url: string | null;
  plan_name: string | null;
  status: MembershipStatus;
  tickets_remaining: number | null;
  sessions_used_this_period: number;
  started_at: string;
  expires_at: string | null;
}

export interface GymTicketPurchase {
  purchased_at: string;
  plan_name: string;
  tickets_bought: number | null;
  xp_spent: number;
}

export interface GymClassTemplate {
  id: number;
  gym_id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  max_capacity: number;
  tickets_cost: number;
}

export type GymClassBlockType = "cronometro" | "amrap" | "emom" | "for_time" | "tabata";
export type GymClassLiveStatus = "pending" | "active" | "paused" | "finished";

export interface GymClassWorkoutExercise {
  id: number;
  block_id: number;
  exercise_id: number;
  exercise?: Exercise;
  exercise_name?: string | null;
  order: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_distance_m: number | null;
  target_duration_sec: number | null;
  notes: string | null;
}

export interface GymClassWorkoutBlock {
  id: number;
  workout_id: number;
  order: number;
  name: string;
  block_type: GymClassBlockType;
  duration_sec: number | null;
  rounds: number | null;
  work_sec: number | null;
  rest_sec: number | null;
  exercises: GymClassWorkoutExercise[];
}

export interface GymClassWorkout {
  id: number;
  gym_id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  blocks: GymClassWorkoutBlock[];
}

export interface ClassLiveState {
  schedule_id: number;
  live_status: GymClassLiveStatus;
  live_block_index: number;
  total_blocks: number;
  elapsed_sec: number;
  remaining_sec: number | null;
  current_block: GymClassWorkoutBlock | null;
  workout_id: number | null;
  workout_name: string | null;
}

export interface GymSchedule {
  id: number;
  template_id: number;
  location_id: number;
  starts_at: string;
  ends_at: string;
  override_capacity: number | null;
  is_cancelled: boolean;
  template_name: string | null;
  location_name: string | null;
  gym_name: string | null;
  gym_id: number | null;
  booked_count: number;
  effective_capacity: number;
  tickets_cost: number;
  user_booking_status: GymBookingStatus | null;
  user_on_waitlist: boolean;
  user_waitlist_position: number | null;
  waitlist_count: number;
  workout_id: number | null;
  live_status: GymClassLiveStatus;
}

export interface GymBooking {
  id: number;
  schedule_id: number;
  user_id: number;
  status: GymBookingStatus;
  tickets_used: number;
  checked_in_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface GymAnalytics {
  total_members: number;
  active_members: number;
  total_classes_this_month: number;
  avg_attendance_rate: number;
  revenue_xp_this_month: number;
}

export interface WeeklySlot {
  id: number;
  gym_id: number;
  day_of_week: number; // 0=Monday, 6=Sunday
  start_time: string;  // "HH:MM"
  end_time: string;
  name: string;
  capacity: number;
  cost: number;
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

// === Plan ===

export interface PlanWorkout {
  id: number;
  plan_id: number;
  template_id: number;
  order: number;
  day: number | null;
  notes: string | null;
  template?: WorkoutTemplate;
}

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  is_public: boolean;
  created_at: string;
  workouts: PlanWorkout[];
  subscription_id: number | null;
}

export interface PlanSubscriber {
  subscription_id: number;
  athlete_id: number;
  athlete_name: string;
  athlete_email: string;
  subscribed_at: string;
}

export interface CoachMessage {
  id: number;
  session_id: number | null;
  athlete_id: number;
  athlete_name: string;
  coach_id: number;
  body: string;
  sent_at: string;
  read_at: string | null;
}

// === Competition ===

export interface CompetitionPlace {
  id: number;
  name: string;
}

export interface CompetitionWorkout {
  id: number;
  template_id: number;
  template_name: string;
  init_time: string;
  order: number;
  notes: string | null;
  places: CompetitionPlace[];
}

export interface Competition {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  creator_name: string;
  location: string;
  init_date: string;
  end_date: string;
  inscription_xp_cost: number;
  subscriber_count: number;
  is_subscribed: boolean;
  created_at: string;
  places: CompetitionPlace[];
  workouts: CompetitionWorkout[];
}

export interface CompetitionLeaderboardEntry {
  rank: number;
  athlete_id: number;
  athlete_name: string;
  total_xp: number;
  workouts_completed: number;
}

export type CompetitionResultStatus = "pending" | "validated" | "rejected";

export interface WorkoutResultEntry {
  id: number;
  position: number | null;
  athlete_id: number;
  athlete_name: string;
  finished_at: string;
  status: CompetitionResultStatus;
  xp_awarded: number;
  session_id: number;
}

export type ChallengeStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

export interface ChallengeUser {
  id: number;
  name: string;
}

export interface Challenge {
  id: number;
  challenger: ChallengeUser;
  challenged: ChallengeUser;
  wager_xp: number;
  status: ChallengeStatus;
  challenger_session_id: number | null;
  challenged_session_id: number | null;
  winner_id: number | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}
