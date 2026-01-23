// Waiting room operations with retry logic and batching
import type { OperationResult, ParticipantWithEmail } from '../types';
import {
  moveToWaitingRoom,
  admitFromWaitingRoom,
  getWaitingRoomParticipants,
} from '../sdk/zoom';
import { retryWithBackoff, processBatch } from '../utils';

const CONCURRENCY_LIMIT = 5;
const MAX_RETRIES = 3;
const BASE_DELAY = 300;

/**
 * Move multiple participants to waiting room with retry and batching
 */
export async function moveParticipantsToWaitingRoom(
  participants: ParticipantWithEmail[],
  onProgress?: (completed: number, total: number) => void
): Promise<OperationResult[]> {
  const results: OperationResult[] = [];

  const processParticipant = async (participant: ParticipantWithEmail): Promise<OperationResult> => {
    let retryCount = 0;
    let lastError: string | undefined;

    try {
      await retryWithBackoff(
        async () => {
          const result = await moveToWaitingRoom(participant.participantUUID);
          if (!result.success) {
            throw new Error(result.error || 'Failed to move participant');
          }
        },
        MAX_RETRIES,
        BASE_DELAY
      );

      return {
        participantUUID: participant.participantUUID,
        success: true,
        retryCount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      return {
        participantUUID: participant.participantUUID,
        success: false,
        error: lastError,
        retryCount: MAX_RETRIES,
      };
    }
  };

  // Process in batches with concurrency limit
  const batchResults = await processBatch(
    participants,
    processParticipant,
    CONCURRENCY_LIMIT,
    onProgress
  );

  results.push(...batchResults);
  return results;
}

/**
 * Admit multiple participants from waiting room with retry and batching
 */
export async function admitParticipantsFromWaitingRoom(
  participantUUIDs: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<OperationResult[]> {
  // First, get current waiting room participants to validate
  const waitingRoomResult = await getWaitingRoomParticipants();
  const waitingRoomUUIDs = new Set(
    waitingRoomResult.participants?.map(p => p.participantUUID) || []
  );

  const results: OperationResult[] = [];

  const processParticipant = async (participantUUID: string): Promise<OperationResult> => {
    // Check if participant is actually in waiting room
    if (!waitingRoomUUIDs.has(participantUUID)) {
      return {
        participantUUID,
        success: false,
        error: 'Participant not in waiting room (may have left meeting)',
        retryCount: 0,
      };
    }

    let retryCount = 0;
    let lastError: string | undefined;

    try {
      await retryWithBackoff(
        async () => {
          const result = await admitFromWaitingRoom(participantUUID);
          if (!result.success) {
            throw new Error(result.error || 'Failed to admit participant');
          }
        },
        MAX_RETRIES,
        BASE_DELAY
      );

      return {
        participantUUID,
        success: true,
        retryCount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      return {
        participantUUID,
        success: false,
        error: lastError,
        retryCount: MAX_RETRIES,
      };
    }
  };

  // Process in batches with concurrency limit
  const batchResults = await processBatch(
    participantUUIDs,
    processParticipant,
    CONCURRENCY_LIMIT,
    onProgress
  );

  results.push(...batchResults);
  return results;
}

/**
 * Retry failed operations
 */
export async function retryFailedOperations(
  failedResults: OperationResult[],
  operation: 'move' | 'admit',
  onProgress?: (completed: number, total: number) => void
): Promise<OperationResult[]> {
  const results: OperationResult[] = [];

  const processParticipant = async (result: OperationResult): Promise<OperationResult> => {
    try {
      const sdkResult = operation === 'move'
        ? await moveToWaitingRoom(result.participantUUID)
        : await admitFromWaitingRoom(result.participantUUID);

      if (!sdkResult.success) {
        throw new Error(sdkResult.error || 'Operation failed');
      }

      return {
        participantUUID: result.participantUUID,
        success: true,
        retryCount: result.retryCount + 1,
      };
    } catch (error) {
      return {
        participantUUID: result.participantUUID,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: result.retryCount + 1,
      };
    }
  };

  const batchResults = await processBatch(
    failedResults,
    processParticipant,
    CONCURRENCY_LIMIT,
    onProgress
  );

  results.push(...batchResults);
  return results;
}
