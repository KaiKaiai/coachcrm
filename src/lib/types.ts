export interface Coach {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Player {
  id: string;
  coach_id: string;
  user_id: string | null;
  invite_token: string;
  invite_accepted: boolean;
  name: string;
  email: string | null;
  position: string | null;
  jersey_number: number | null;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  coach_id: string;
  title: string;
  date: string;
  transcript: string | null;
  status: "recording" | "transcribed" | "analyzed";
  created_at: string;
}

export interface SessionPlayer {
  session_id: string;
  player_id: string;
}

export interface PlayerFeedback {
  id: string;
  session_id: string;
  player_id: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  drills_recommended: RecommendedDrill[];
  overall_rating: number;
  raw_ai_response: Record<string, unknown> | null;
  created_at: string;
}

export interface PlayerFeedbackWithPlayer extends PlayerFeedback {
  players: Pick<Player, "name" | "position" | "jersey_number">;
}

export interface RecommendedDrill {
  title: string;
  description?: string;
  category?: DrillCategory;
  difficulty?: DrillDifficulty;
  sets?: number;
  reps?: number;
  estimated_minutes?: number;
  target_metric?: string;
}

export type DrillCategory =
  | "shooting"
  | "dribbling"
  | "passing"
  | "defense"
  | "conditioning"
  | "footwork"
  | "other";

export type DrillDifficulty = "beginner" | "intermediate" | "advanced";

export interface Drill {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  category: DrillCategory | null;
  difficulty: DrillDifficulty | null;
  estimated_minutes: number | null;
  video_url: string | null;
  sets: number | null;
  reps: number | null;
  target_metric: string | null;
  created_at: string;
}

export type HomeworkStatus = "assigned" | "in_progress" | "completed";

export interface PlayerDrill {
  id: string;
  player_id: string;
  drill_id: string;
  session_id: string | null;
  assigned_at: string;
  due_date: string | null;
  status: HomeworkStatus;
  notes: string | null;
  player_notes: string | null;
  completed_at: string | null;
}

export interface PlayerDrillWithDrill extends PlayerDrill {
  drills: Drill;
}

export interface PlayerDrillWithPlayer extends PlayerDrill {
  players: Pick<Player, "id" | "name" | "position" | "jersey_number">;
}

export type ScheduleStatus = "scheduled" | "completed" | "cancelled";

export interface ScheduledSession {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: ScheduleStatus;
  training_session_id: string | null;
  created_at: string;
}

export interface ScheduledSessionWithPlayers extends ScheduledSession {
  scheduled_session_players: {
    player_id: string;
    players: Pick<Player, "id" | "name" | "position" | "jersey_number">;
  }[];
}

export const DRILL_CATEGORIES: { value: DrillCategory; label: string }[] = [
  { value: "shooting", label: "Shooting" },
  { value: "dribbling", label: "Dribbling" },
  { value: "passing", label: "Passing" },
  { value: "defense", label: "Defense" },
  { value: "conditioning", label: "Conditioning" },
  { value: "footwork", label: "Footwork" },
  { value: "other", label: "Other" },
];

export const DRILL_DIFFICULTIES: { value: DrillDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const POSITIONS = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
];
