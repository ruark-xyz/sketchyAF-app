// Game System Types
// Comprehensive TypeScript definitions for the SketchyAF game system

export type GameStatus = 
  | 'waiting'      // Waiting for players to join
  | 'briefing'     // Pre-round briefing phase
  | 'drawing'      // Active drawing phase
  | 'voting'       // Voting on submissions
  | 'results'      // Showing results
  | 'completed'    // Game finished
  | 'cancelled';   // Game cancelled/expired

export type PurchaseMethod = 
  | 'free'         // Free pack
  | 'purchase'     // One-time purchase
  | 'subscription' // Premium subscription
  | 'admin';       // Admin granted

// Core Game Interfaces
export interface Game {
  id: string;
  status: GameStatus;
  prompt: string;
  max_players: number;
  current_players: number;
  round_duration: number; // seconds
  voting_duration: number; // seconds
  created_at: string;
  started_at?: string;
  drawing_started_at?: string;
  voting_started_at?: string;
  completed_at?: string;
  expires_at: string;
  winner_id?: string;
  created_by?: string;
}

export interface GameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  joined_at: string;
  left_at?: string;
  is_ready: boolean;
  selected_booster_pack?: string;
  placement?: number; // Final placement (1st, 2nd, etc.)
}

export interface Submission {
  id: string;
  game_id: string;
  user_id: string;
  drawing_data: any; // Excalidraw elements and app state
  drawing_url?: string; // Exported image URL
  drawing_thumbnail_url?: string; // Thumbnail for lists
  submitted_at: string;
  vote_count: number;
  is_winner: boolean;
  
  // Metadata
  canvas_width?: number;
  canvas_height?: number;
  element_count?: number;
  drawing_time_seconds?: number;
}

export interface Vote {
  id: string;
  game_id: string;
  voter_id: string;
  submission_id: string;
  voted_at: string;
}

export interface BoosterPack {
  id: string;
  title: string;
  description?: string;
  is_premium: boolean;
  asset_directory_name: string; // References folder in ./src/assets/image-libraries/
  cover_image_url?: string;
  price_cents: number;
  category?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  
  // Metadata
  asset_count: number;
  download_count: number;
  usage_count: number;
}

export interface UserBoosterPack {
  user_id: string;
  booster_pack_id: string;
  unlocked_at: string;
  purchase_method: PurchaseMethod;
  purchase_price_cents: number;
}

export interface AssetUsageTracking {
  id: string;
  user_id: string;
  game_id?: string;
  booster_pack_id: string;
  asset_filename: string;
  used_at: string;
  session_id?: string;
  canvas_position?: any; // JSONB for position data
}

// Extended interfaces with joined data
export interface GameWithParticipants extends Game {
  participants: (GameParticipant & { username: string; avatar_url?: string })[];
}

export interface SubmissionWithUser extends Submission {
  username: string;
  avatar_url?: string;
}

export interface VoteWithDetails extends Vote {
  voter_username: string;
  submission_user_id: string;
  submission_username: string;
}

export interface BoosterPackWithOwnership extends BoosterPack {
  is_owned: boolean;
  unlocked_at?: string;
}

// Game Results and Analytics
export interface GameResults {
  game_id: string;
  submissions: Array<{
    submission_id: string;
    user_id: string;
    username: string;
    vote_count: number;
    placement: number;
  }>;
  winner: {
    user_id: string;
    username: string;
    submission_id: string;
  };
  total_votes: number;
  participation_rate: number; // percentage of players who submitted
}

export interface AssetInfo {
  filename: string;
  path: string;
  type: 'svg' | 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp';
  thumbnail?: string;
  size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

// Service Response Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Game Creation and Update Types
export interface CreateGameRequest {
  prompt: string;
  max_players?: number;
  round_duration?: number;
  voting_duration?: number;
}

export interface JoinGameRequest {
  game_id: string;
  selected_booster_pack?: string;
}

export interface SubmitDrawingRequest {
  game_id: string;
  drawing_data: any;
  drawing_url?: string;
  drawing_thumbnail_url?: string;
  canvas_width?: number;
  canvas_height?: number;
  element_count?: number;
  drawing_time_seconds?: number;
}

export interface CastVoteRequest {
  game_id: string;
  submission_id: string;
}

// Matchmaking Types
export interface MatchmakingQueue {
  user_id: string;
  joined_at: string;
  preferences: {
    max_players?: number;
    round_duration?: number;
    categories?: string[];
  };
}

export interface MatchmakingResult {
  game_id: string;
  participants: string[]; // user IDs
  estimated_start_time: string;
}

// Real-time Event Types
export interface GameEvent {
  type: 'player_joined' | 'player_left' | 'player_ready' | 'status_changed' | 
        'submission_received' | 'vote_cast' | 'game_completed';
  game_id: string;
  user_id?: string;
  data?: any;
  timestamp: string;
}

// Error Types
export interface GameError {
  code: 'GAME_NOT_FOUND' | 'GAME_FULL' | 'INVALID_STATUS' | 'ALREADY_JOINED' | 
        'NOT_PARTICIPANT' | 'VOTING_CLOSED' | 'ALREADY_VOTED' | 'INVALID_SUBMISSION' |
        'PACK_NOT_OWNED' | 'PACK_NOT_FOUND' | 'INSUFFICIENT_PERMISSIONS';
  message: string;
  details?: any;
}

// Constants
export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  DEFAULT_PLAYERS: 4,
  MIN_ROUND_DURATION: 30,
  MAX_ROUND_DURATION: 300,
  DEFAULT_ROUND_DURATION: 60,
  MIN_VOTING_DURATION: 15,
  MAX_VOTING_DURATION: 120,
  DEFAULT_VOTING_DURATION: 30,
  GAME_EXPIRY_MINUTES: 30,
  MAX_SUBMISSION_SIZE_MB: 10,
} as const;

export const GAME_STATUS_FLOW: Record<GameStatus, GameStatus[]> = {
  waiting: ['briefing', 'cancelled'],
  briefing: ['drawing', 'cancelled'],
  drawing: ['voting', 'cancelled'],
  voting: ['results', 'cancelled'],
  results: ['completed'],
  completed: [],
  cancelled: [],
} as const;