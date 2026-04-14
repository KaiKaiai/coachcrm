export interface Coach {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Player {
  id: string;
  coach_id: string;
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
  drills_recommended: string[];
  overall_rating: number;
  raw_ai_response: Record<string, unknown> | null;
  created_at: string;
}

export interface PlayerFeedbackWithPlayer extends PlayerFeedback {
  players: Pick<Player, "name" | "position" | "jersey_number">;
}
