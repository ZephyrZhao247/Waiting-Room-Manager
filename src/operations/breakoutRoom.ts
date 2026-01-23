// Breakout room operations for managing participants
import {
  createBreakoutRooms,
  configureBreakoutRooms,
  openBreakoutRooms,
  closeBreakoutRooms,
  assignParticipantToBreakoutRoom,
  getBreakoutRoomList,
} from '../sdk/zoom';
import type { ParticipantWithEmail, OperationResult } from '../types';

const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 3;
const BATCH_DELAY_MS = 200;

/**
 * Send participants to breakout room(s)
 * Creates breakout rooms, assigns participants, and opens the rooms
 */
export async function sendParticipantsToBreakoutRooms(
  participants: ParticipantWithEmail[],
  roundId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  
  if (participants.length === 0) {
    return results;
  }

  try {
    // Step 1: Close any existing breakout rooms first
    console.log('[Breakout] Closing any existing breakout rooms...');
    const listResult = await getBreakoutRoomList();
    if (listResult.success && listResult.state === 'open') {
      const closeResult = await closeBreakoutRooms();
      if (!closeResult.success) {
        console.warn('[Breakout] Failed to close existing rooms:', closeResult.error);
      } else {
        console.log('[Breakout] Closed existing breakout rooms');
        await waitForBreakoutRoomsToClose();
      }
    }

    // Step 2: Create a single breakout room for all conflicted participants
    const roomName = `Round ${roundId}`;
    console.log('[Breakout] Creating new breakout room...');
    const createResult = await createBreakoutRooms({
      numberOfRooms: 1,
      assign: 'manually',
      names: [roomName],
    });

    if (!createResult.success || !createResult.rooms) {
      throw new Error(createResult.error || 'Failed to create breakout rooms');
    }

    const breakoutRoomId = createResult.rooms.rooms?.[0]?.breakoutRoomId;
    if (!breakoutRoomId) {
      throw new Error('No breakout room ID returned');
    }

    console.log(`[Breakout] Created room: ${breakoutRoomId} - ${roomName}`);

    // Step 3: Configure breakout room settings
    await configureBreakoutRooms({
      allowParticipantsReturnToMainSession: false, // Prevent self-return
      automaticallyMoveParticipantsIntoRooms: true, // Auto-move when opened
      countDown: 0,
    });

    // Step 4: Assign participants to the breakout room
    let completed = 0;
    for (const participant of participants) {
      const result = await assignParticipantWithRetry(
        breakoutRoomId,
        participant.participantUUID,
        participant.displayName
      );
      
      results.push(result);
      completed++;
      
      if (onProgress) {
        onProgress(completed, participants.length);
      }

      // Small delay between assignments
      if (completed < participants.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    await delay(BATCH_DELAY_MS * 2);
    // Step 5: Open breakout rooms to activate assignments
    const openResult = await openBreakoutRooms();
    if (!openResult.success) {
      console.warn('[Breakout] Failed to open rooms:', openResult.error);
    } else {
      console.log('[Breakout] Opened breakout rooms');
    }

    return results;
  } catch (error) {
    console.error('[Breakout] Error sending participants to breakout rooms:', error);
    
    // Mark all participants as failed if room creation failed
    return participants.map(p => ({
      participantUUID: p.participantUUID,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create breakout rooms',
      retryCount: 0,
    }));
  }
}

/**
 * Return participants from breakout rooms to main meeting
 * Closes all breakout rooms
 */
export async function returnParticipantsFromBreakoutRooms(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Simply close all breakout rooms (returns everyone to main meeting)
    console.log('[Breakout] Closing all breakout rooms...');
    const closeResult = await closeBreakoutRooms();
    
    if (!closeResult.success) {
      throw new Error(closeResult.error || 'Failed to close breakout rooms');
    }

    console.log('[Breakout] Successfully closed all breakout rooms');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Breakout] Error closing breakout rooms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close breakout rooms',
    };
  }
}

/**
 * Assign a single participant to a breakout room with retry logic
 */
async function assignParticipantWithRetry(
  breakoutRoomId: string,
  participantUUID: string,
  displayName: string,
  retryCount = 0
): Promise<OperationResult> {
  try {
    const result = await assignParticipantToBreakoutRoom(breakoutRoomId, participantUUID);
    
    if (result.success) {
      console.log(`[Breakout] ✓ Assigned ${displayName} (${participantUUID})`);
      return {
        participantUUID,
        success: true,
        retryCount,
      };
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.warn(
        `[Breakout] Retry ${retryCount + 1}/${MAX_RETRIES} for ${displayName}: ${errorMsg}`
      );
      await delay(RETRY_DELAY_MS * (retryCount + 1));
      return assignParticipantWithRetry(breakoutRoomId, participantUUID, displayName, retryCount + 1);
    }

    console.error(`[Breakout] ✗ Failed ${displayName} after ${retryCount} retries: ${errorMsg}`);
    return {
      participantUUID,
      success: false,
      error: errorMsg,
      retryCount,
    };
  }
}

/**
 * Utility: delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForBreakoutRoomsToClose(timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getBreakoutRoomList();
    if (!status.success || status.state !== 'open') {
      return;
    }
    await delay(400);
  }
  console.warn('[Breakout] Timed out waiting for rooms to close; continuing anyway');
}
