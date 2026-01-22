// Global state management with Zustand and localStorage persistence
import { create } from 'zustand';
import type {
  AppState,
  RoundId,
  RoundState,
  ActionLogEntry,
  PersistedState,
} from '../types';
import { generateUUID } from '../utils';

const STORAGE_KEY = 'zoom-waiting-room-manager-state';

/**
 * Load persisted state from localStorage
 */
function loadPersistedState(): Partial<AppState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: PersistedState = JSON.parse(stored);

    // Convert stored arrays back to Sets and Maps
    const parsedRounds = new Map<RoundId, Set<string>>();
    Object.entries(parsed.parsedRounds || {}).forEach(([roundId, emails]) => {
      parsedRounds.set(roundId, new Set(emails));
    });

    const emailToName = new Map<string, string>();
    Object.entries(parsed.emailToName || {}).forEach(([email, name]) => {
      emailToName.set(email, name);
    });

    const activeRounds = new Map<RoundId, RoundState>();
    Object.entries(parsed.activeRounds || {}).forEach(([roundId, state]) => {
      activeRounds.set(roundId, {
        roundId,
        movedParticipants: new Set(state.movedParticipants),
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        movedCount: state.movedCount,
        admittedCount: state.admittedCount,
      });
    });

    return {
      sessionId: parsed.sessionId,
      parsedRounds,
      emailToName,
      activeRounds,
      selectedRoundId: parsed.selectedRoundId,
    };
  } catch (error) {
    console.error('Failed to load persisted state:', error);
    return null;
  }
}

/**
 * Save state to localStorage
 */
function saveState(state: AppState): void {
  try {
    // Convert Maps and Sets to plain objects/arrays for JSON serialization
    const parsedRounds: Record<RoundId, string[]> = {};
    state.parsedRounds.forEach((emails, roundId) => {
      parsedRounds[roundId] = Array.from(emails);
    });

    const emailToName: Record<string, string> = {};
    state.emailToName.forEach((name, email) => {
      emailToName[email] = name;
    });

    const activeRounds: Record<RoundId, any> = {};
    state.activeRounds.forEach((roundState, roundId) => {
      activeRounds[roundId] = {
        movedParticipants: Array.from(roundState.movedParticipants),
        startedAt: roundState.startedAt,
        endedAt: roundState.endedAt,
        movedCount: roundState.movedCount,
        admittedCount: roundState.admittedCount,
      };
    });

    const toStore: PersistedState = {
      sessionId: state.sessionId,
      parsedRounds,
      emailToName,
      activeRounds,
      selectedRoundId: state.selectedRoundId,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

/**
 * Create initial state
 */
function createInitialState(): AppState {
  const persisted = loadPersistedState();
  
  return {
    sessionId: persisted?.sessionId || generateUUID(),
    parsedRounds: persisted?.parsedRounds || new Map(),
    emailToName: persisted?.emailToName || new Map(),
    activeRounds: persisted?.activeRounds || new Map(),
    actionLog: [],
    selectedRoundId: persisted?.selectedRoundId || null,
    isProcessing: false,
    fallbackMode: false,
    cachedParticipants: null,
    lastEmailFetchTime: null,
    emailOverrides: new Map(),
  };
}

/**
 * Zustand store for app state
 */
export const useAppStore = create<AppState & {
  // Actions
  setParsedRounds: (rounds: Map<RoundId, Set<string>>) => void;
  setEmailToName: (emailToName: Map<string, string>) => void;
  setSelectedRoundId: (roundId: RoundId | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setFallbackMode: (enabled: boolean) => void;
  addActionLog: (entry: Omit<ActionLogEntry, 'id' | 'timestamp' | 'sessionId'>) => void;
  startRound: (roundId: RoundId) => void;
  endRound: (roundId: RoundId) => void;
  addMovedParticipant: (roundId: RoundId, participantUUID: string) => void;
  updateRoundStats: (roundId: RoundId, movedCount: number, admittedCount: number) => void;
  clearRound: (roundId: RoundId) => void;
  resetState: () => void;
  getMovedParticipants: (roundId: RoundId) => Set<string>;
  setCachedParticipants: (participants: any[]) => void;
  clearCachedParticipants: () => void;
  updateParticipantEmail: (participantUUID: string, email: string) => void;
  setEmailOverride: (participantUUID: string, email: string) => void;
  removeEmailOverride: (participantUUID: string) => void;
}>((set, get) => ({
  ...createInitialState(),

  setParsedRounds: (rounds) => {
    set({ parsedRounds: rounds });
    saveState(get());
  },

  setEmailToName: (emailToName) => {
    set({ emailToName });
    saveState(get());
  },

  setSelectedRoundId: (roundId) => {
    set({ selectedRoundId: roundId });
    saveState(get());
  },

  setIsProcessing: (isProcessing) => {
    set({ isProcessing });
  },

  setFallbackMode: (enabled) => {
    set({ fallbackMode: enabled });
  },

  addActionLog: (entry) => {
    const newEntry: ActionLogEntry = {
      ...entry,
      id: generateUUID(),
      timestamp: Date.now(),
      sessionId: get().sessionId,
    };
    
    set((state) => ({
      actionLog: [...state.actionLog, newEntry],
    }));
  },

  startRound: (roundId) => {
    const activeRounds = new Map(get().activeRounds);
    
    if (!activeRounds.has(roundId)) {
      activeRounds.set(roundId, {
        roundId,
        movedParticipants: new Set(),
        startedAt: Date.now(),
        movedCount: 0,
        admittedCount: 0,
      });
    } else {
      const roundState = activeRounds.get(roundId)!;
      roundState.startedAt = Date.now();
      roundState.endedAt = undefined;
    }

    set({ activeRounds });
    saveState(get());

    get().addActionLog({
      type: 'start_round',
      roundId,
      status: 'success',
    });
  },

  endRound: (roundId) => {
    const activeRounds = new Map(get().activeRounds);
    const roundState = activeRounds.get(roundId);

    if (roundState) {
      roundState.endedAt = Date.now();
      set({ activeRounds });
      saveState(get());
    }

    get().addActionLog({
      type: 'end_round',
      roundId,
      status: 'success',
    });
  },

  addMovedParticipant: (roundId, participantUUID) => {
    const activeRounds = new Map(get().activeRounds);
    
    if (!activeRounds.has(roundId)) {
      activeRounds.set(roundId, {
        roundId,
        movedParticipants: new Set([participantUUID]),
        startedAt: Date.now(),
        movedCount: 0,
        admittedCount: 0,
      });
    } else {
      activeRounds.get(roundId)!.movedParticipants.add(participantUUID);
    }

    set({ activeRounds });
    saveState(get());
  },

  updateRoundStats: (roundId, movedCount, admittedCount) => {
    const activeRounds = new Map(get().activeRounds);
    const roundState = activeRounds.get(roundId);

    if (roundState) {
      roundState.movedCount = movedCount;
      roundState.admittedCount = admittedCount;
      set({ activeRounds });
      saveState(get());
    }
  },

  clearRound: (roundId) => {
    const activeRounds = new Map(get().activeRounds);
    activeRounds.delete(roundId);
    set({ activeRounds });
    saveState(get());
  },

  resetState: () => {
    const newState = {
      ...createInitialState(),
      sessionId: generateUUID(), // Generate new session ID on reset
    };
    set(newState);
    localStorage.removeItem(STORAGE_KEY);
  },

  getMovedParticipants: (roundId) => {
    const roundState = get().activeRounds.get(roundId);
    return roundState?.movedParticipants || new Set();
  },

  setCachedParticipants: (participants) => {
    set({ 
      cachedParticipants: participants,
      lastEmailFetchTime: Date.now(),
    });
  },

  clearCachedParticipants: () => {
    set({ 
      cachedParticipants: null,
      lastEmailFetchTime: null,
    });
  },

  updateParticipantEmail: (participantUUID, email) => {
    const cachedParticipants = get().cachedParticipants;
    if (!cachedParticipants) return;

    const updated = cachedParticipants.map(p => 
      p.participantUUID === participantUUID ? { ...p, email } : p
    );
    
    set({ cachedParticipants: updated });
    console.log(`[Store] Updated email for ${participantUUID}: ${email}`);
  },

  setEmailOverride: (participantUUID, email) => {
    const emailOverrides = new Map(get().emailOverrides);
    emailOverrides.set(participantUUID, email.toLowerCase().trim());
    set({ emailOverrides });
  },

  removeEmailOverride: (participantUUID) => {
    const emailOverrides = new Map(get().emailOverrides);
    emailOverrides.delete(participantUUID);
    set({ emailOverrides });
  },
}));
