// Type definitions for the Zoom Waiting Room Manager

export interface Participant {
  participantUUID: string;
  displayName: string;
  role?: string;
}

export interface ParticipantWithEmail extends Participant {
  email?: string;
}

export interface WaitingRoomParticipant {
  participantUUID: string;
  displayName: string;
}

// CSV types
export type RoundId = string;

// Maps email to registered name
export type EmailToNameMap = Map<string, string>;

export interface ParsedCSVRowBased {
  format: 'row-based';
  rounds: Map<RoundId, Set<string>>; // roundId -> Set of normalized emails
  emailToName: EmailToNameMap; // email -> registered name
}

export interface ParsedCSVColumnBased {
  format: 'column-based';
  rounds: Map<RoundId, Set<string>>; // roundId -> Set of normalized emails
  emailToName: EmailToNameMap; // email -> registered name
}

export type ParsedCSV = ParsedCSVRowBased | ParsedCSVColumnBased;

export interface CSVParseResult {
  success: boolean;
  data?: ParsedCSV;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    roundsFound: number;
    uniqueEmails: number;
  };
}

// Action log types
export type ActionType = 'move_to_waiting_room' | 'admit_from_waiting_room' | 'parse_csv' | 'start_round' | 'end_round';
export type ActionStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  type: ActionType;
  roundId?: RoundId;
  participantUUID?: string;
  displayName?: string;
  email?: string;
  status: ActionStatus;
  error?: string;
  retryCount?: number;
}

// State types
export interface RoundState {
  roundId: RoundId;
  movedParticipants: Set<string>; // participantUUIDs moved by this app for this round
  startedAt?: number;
  endedAt?: number;
  movedCount: number;
  admittedCount: number;
}

export interface AppState {
  sessionId: string;
  parsedRounds: Map<RoundId, Set<string>>; // roundId -> Set of conflict emails
  emailToName: Map<string, string>; // email -> registered name from CSV
  activeRounds: Map<RoundId, RoundState>;
  actionLog: ActionLogEntry[];
  selectedRoundId: RoundId | null;
  isProcessing: boolean;
  fallbackMode: boolean;
  cachedParticipants: ParticipantWithEmail[] | null; // Cached participant emails
  lastEmailFetchTime: number | null; // Timestamp of last email fetch
  emailOverrides: Map<string, string>; // participantUUID -> manually assigned email
}

// Waiting room operation types
export interface WaitingRoomOperation {
  participantUUID: string;
  displayName: string;
  email?: string;
  type: 'move' | 'admit';
}

export interface OperationResult {
  participantUUID: string;
  success: boolean;
  error?: string;
  retryCount: number;
}

// Match result for UI
export interface MatchResult {
  matched: ParticipantWithEmail[];
  notFound: string[]; // emails from CSV not found in meeting
  noEmail: Participant[]; // participants without email (need fallback)
}

// Zoom SDK capabilities we need
export type ZoomCapability =
  | 'getMeetingParticipants'
  | 'getMeetingParticipantsEmail'
  | 'putParticipantToWaitingRoom'
  | 'admitParticipantFromWaitingRoom'
  | 'getWaitingRoomParticipants'
  | 'showNotification';

export interface ZoomSDKConfig {
  capabilities: ZoomCapability[];
}

// Persistence types
export interface PersistedState {
  sessionId: string;
  parsedRounds: Record<RoundId, string[]>;
  emailToName: Record<string, string>; // email -> registered name
  activeRounds: Record<RoundId, {
    movedParticipants: string[];
    startedAt?: number;
    endedAt?: number;
    movedCount: number;
    admittedCount: number;
  }>;
  selectedRoundId: RoundId | null;
  lastUpdated: number;
}
