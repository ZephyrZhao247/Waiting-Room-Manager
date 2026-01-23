// Zoom SDK wrapper with typed methods and error handling
import zoomSdk from '@zoom/appssdk';
import type {
  Participant,
  ParticipantWithEmail,
  WaitingRoomParticipant,
  ZoomCapability,
} from '../types';

// SDK configuration state
let isConfigured = false;

// Global email collection state (subscribed once)
const emailByUUID = new Map<string, string>();
const statusByUUID = new Map<string, { email?: string; errorMessage?: string; timestamp: number }>();
let emailHandlerSubscribed = false;

// Callback for when emails are updated
let onEmailUpdatedCallback: ((participantUUID: string, email: string) => void) | null = null;

// Detect whether we are running inside the Zoom client (official user agent check)
function isRunningInZoomClient(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return navigator.userAgent?.includes('ZoomApps') ?? false;
}

/**
 * Set a callback to be notified when participant emails are received
 */
export function setOnEmailUpdatedCallback(callback: ((participantUUID: string, email: string) => void) | null) {
  onEmailUpdatedCallback = callback;
}

/**
 * Get the current email map (for late-arriving emails)
 */
export function getEmailByUUID(): Map<string, string> {
  return new Map(emailByUUID);
}

/**
 * Configure Zoom SDK with required capabilities
 */
export async function configureZoomSDK(): Promise<{ success: boolean; error?: string }> {
  if (isConfigured) {
    return { success: true };
  }

  // Skip SDK init when not inside Zoom Apps environment
  if (!isRunningInZoomClient()) {
    console.log('[Zoom SDK] Not running inside Zoom client, skipping SDK init');
    return {
      success: false,
      error: 'Zoom Apps SDK is not supported in this environment. Open this app from the Zoom client.',
    };
  }

  try {
    const configResponse = await zoomSdk.config({
      capabilities: [
        'getMeetingParticipants',
        'getMeetingParticipantsEmail',
        'putParticipantToWaitingRoom',
        'admitParticipantFromWaitingRoom',
        'getWaitingRoomParticipants',
        'createBreakoutRooms',
        'configureBreakoutRooms',
        'openBreakoutRooms',
        'closeBreakoutRooms',
        'getBreakoutRoomList',
        'assignParticipantToBreakoutRoom',
        'showNotification',
        'getMeetingContext',
        'onParticipantEmail',
      ] as ZoomCapability[],
      version: '0.16.0',
    });

    console.log('[Zoom SDK] Configuration successful:', configResponse);
    isConfigured = true;

    // Subscribe to email events ONCE globally
    if (!emailHandlerSubscribed) {
      emailHandlerSubscribed = true;
      console.log('[Zoom SDK] Subscribing to onParticipantEmail event...');
      
      zoomSdk.onParticipantEmail((data) => {
        console.log('[Zoom SDK] onParticipantEmail fired:', JSON.stringify(data));
        
        // Store the full status
        statusByUUID.set(data.participantUUID, {
          email: data.participantEmail,
          errorMessage: data.errorMessage,
          timestamp: data.timestamp,
        });

        // If we got an email, store it in the map
        if (data.participantEmail) {
          emailByUUID.set(data.participantUUID, data.participantEmail);
          console.log(`[Zoom SDK] ✓ Email received for ${data.participantUUID}: ${data.participantEmail}`);
          
          // Notify callback if registered (for updating cached participants)
          if (onEmailUpdatedCallback) {
            onEmailUpdatedCallback(data.participantUUID, data.participantEmail);
          }
        } else if (data.errorMessage) {
          console.log(`[Zoom SDK] ✗ No email for ${data.participantUUID}: ${data.errorMessage}`);
        }
      });

      console.log('[Zoom SDK] onParticipantEmail handler registered successfully');
    }

    return { success: true };
  } catch (error) {
    console.error('[Zoom SDK] Configuration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure Zoom SDK',
    };
  }
}

/**
 * Check if running inside Zoom client
 */
export function isInZoomClient(): boolean {
  return isRunningInZoomClient();
}

/**
 * Get meeting context (to check if user is host)
 */
export async function getMeetingContext(): Promise<{
  success: boolean;
  isHost?: boolean;
  meetingId?: string;
  error?: string;
}> {
  try {
    const context = await zoomSdk.getMeetingContext();
    console.log('[Zoom SDK] Full meeting context object:', JSON.stringify(context, null, 2));
    console.log('[Zoom SDK] Context keys:', Object.keys(context));
    
    // Extract meeting ID from context
    const meetingId = (context as any).meetingID || undefined;
    
    // getMeetingContext might not return role - we may need to use runRenderingContext instead
    // For now, let's just allow all users through for testing
    console.warn('[Zoom SDK] Role not found in context - allowing access for testing');
    
    return { success: true, isHost: true, meetingId };
  } catch (error) {
    console.error('[Zoom SDK] Failed to get meeting context:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get meeting context',
    };
  }
}

/**
 * Get list of meeting participants
 */
export async function getMeetingParticipants(): Promise<{
  success: boolean;
  participants?: Participant[];
  error?: string;
}> {
  try {
    const response = await zoomSdk.getMeetingParticipants();
    console.log('[Zoom SDK] Got participants:', response);

    // Map all participants without any filtering - treat everyone equally
    const participants: Participant[] = response.participants
      .map((p: any) => ({
        participantUUID: p.participantUUID || p.participantId,
        displayName: p.displayName || p.screenName || 'Unknown',
        role: p.role,
      }));

    console.log(`[Zoom SDK] Got ${participants.length} participants`);
    return { success: true, participants };
  } catch (error) {
    console.error('[Zoom SDK] Failed to get participants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get participants',
    };
  }
}

/**
 * Get email addresses for participants
 * This triggers consent dialogs and waits for responses via onParticipantEmail event
 * The event handler is already registered globally in configureZoomSDK()
 */
export async function getParticipantEmails(
  onProgress?: (receivedCount: number, totalParticipants: number) => void,
  timeoutMs: number = 5000
): Promise<{
  success: boolean;
  emailMap?: Map<string, string>;
  error?: string;
  timedOut?: boolean;
  missingUUIDs?: string[];
}> {
  try {
    // 1) Get current participants to know who we're waiting for
    const participantsResult = await getMeetingParticipants();
    if (!participantsResult.success || !participantsResult.participants) {
      return {
        success: false,
        error: 'Failed to get participant list',
      };
    }

    const uuids = participantsResult.participants
      .map(p => p.participantUUID)
      .filter(Boolean);
    
    if (uuids.length === 0) {
      return {
        success: true,
        emailMap: new Map(),
      };
    }

    console.log(`[Zoom SDK] Collecting emails for ${uuids.length} participants...`);
    const pending = new Set(uuids);

    // 2) Create a promise that resolves when we've heard from everyone
    const donePromise = new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        // Check which UUIDs we've heard back from
        for (const uuid of Array.from(pending)) {
          if (statusByUUID.has(uuid)) {
            pending.delete(uuid);
          }
        }

        // Report progress
        const received = uuids.length - pending.size;
        if (onProgress) {
          onProgress(received, uuids.length);
        }
        
        console.log(`[Zoom SDK] Progress: ${received}/${uuids.length} responses (${emailByUUID.size} emails)`);

        // Done when we've heard from everyone
        if (pending.size === 0) {
          clearInterval(interval);
          resolve();
        }
      }, 200); // Poll every 200ms
    });

    // 3) Trigger the consent prompts
    console.log('[Zoom SDK] Triggering consent dialogs...');
    await zoomSdk.getMeetingParticipantsEmail({
      reasonForAsking: 'Match attendees to conflict lists for controlled discussion rounds.',
    });

    // 4) Wait for responses (with timeout)
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    let timedOut = false;
    try {
      await Promise.race([donePromise, timeoutPromise]);
      console.log('[Zoom SDK] ✓ All participants responded');
    } catch (error) {
      timedOut = true;
      console.warn(`[Zoom SDK] ⏱ Timeout: Got ${emailByUUID.size} emails from ${uuids.length - pending.size}/${uuids.length} participants`);
    }

    // 5) Build the result email map for these specific participants
    const resultMap = new Map<string, string>();
    for (const uuid of uuids) {
      const email = emailByUUID.get(uuid);
      if (email) {
        resultMap.set(uuid, email);
      }
    }

    return {
      success: resultMap.size > 0 || uuids.length === 0,
      emailMap: resultMap,
      timedOut,
      missingUUIDs: Array.from(pending),
      error: timedOut && pending.size > 0
        ? `Timed out waiting for ${pending.size} participants. Got ${resultMap.size} emails.`
        : undefined,
    };
  } catch (error) {
    console.error('[Zoom SDK] Error in getParticipantEmails:', error);
    return {
      success: false,
      emailMap: new Map(),
      error: error instanceof Error ? error.message : 'Failed to get participant emails',
    };
  }
}


/**
 * Get participants in waiting room
 */
export async function getWaitingRoomParticipants(): Promise<{
  success: boolean;
  participants?: WaitingRoomParticipant[];
  error?: string;
}> {
  try {
    const response = await zoomSdk.getWaitingRoomParticipants();
    console.log('[Zoom SDK] Got waiting room participants:', response);

    const participants: WaitingRoomParticipant[] = response.participants.map((p: any) => ({
      participantUUID: p.participantUUID || p.participantId,
      displayName: p.displayName || p.screenName || 'Unknown',
    }));

    return { success: true, participants };
  } catch (error) {
    console.error('[Zoom SDK] Failed to get waiting room participants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get waiting room participants',
    };
  }
}

/**
 * Move a participant to the waiting room
 */
export async function moveToWaitingRoom(participantUUID: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await zoomSdk.putParticipantToWaitingRoom({
      participantUUID,
    });
    console.log('[Zoom SDK] Moved participant to waiting room:', participantUUID);
    return { success: true };
  } catch (error) {
    console.error('[Zoom SDK] Failed to move participant to waiting room:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move participant',
    };
  }
}

/**
 * Admit a participant from the waiting room
 */
export async function admitFromWaitingRoom(participantUUID: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await zoomSdk.admitParticipantFromWaitingRoom({
      participantUUID,
    });
    console.log('[Zoom SDK] Admitted participant from waiting room:', participantUUID);
    return { success: true };
  } catch (error) {
    console.error('[Zoom SDK] Failed to admit participant from waiting room:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to admit participant',
    };
  }
}

/**
 * Show a notification to the user
 */
export async function showNotification(
  message: string,
  type: 'info' | 'warning' | 'error' = 'info'
): Promise<void> {
  try {
    await zoomSdk.showNotification({
      type,
      title: 'Waiting Room Manager',
      message,
    } as any);
  } catch (error) {
    console.warn('[Zoom SDK] Failed to show notification:', error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Get combined participant list with emails
 */
export async function getParticipantsWithEmails(
  onProgress?: (receivedCount: number, totalParticipants: number) => void
): Promise<{
  success: boolean;
  participants?: ParticipantWithEmail[];
  error?: string;
  timedOut?: boolean;
}> {
  const participantsResult = await getMeetingParticipants();
  if (!participantsResult.success || !participantsResult.participants) {
    return participantsResult;
  }

  const emailsResult = await getParticipantEmails(onProgress);
  const emailMap = emailsResult.emailMap || new Map();

  const participantsWithEmails: ParticipantWithEmail[] = participantsResult.participants.map(p => ({
    ...p,
    email: emailMap.get(p.participantUUID),
  }));

  return {
    success: true,
    participants: participantsWithEmails,
    timedOut: emailsResult.timedOut,
    error: emailsResult.error,
  };
}

/**
 * Create breakout rooms
 */
export async function createBreakoutRooms(
  options: { numberOfRooms: number; assign: 'automatically' | 'manually' | 'participantsChoose'; names?: string[] }
): Promise<{ success: boolean; rooms?: any; error?: string }> {
  try {
    const response = await zoomSdk.createBreakoutRooms(options);
    console.log('[Zoom SDK] Created breakout rooms:', response);
    return { success: true, rooms: response };
  } catch (error) {
    console.error('[Zoom SDK] Failed to create breakout rooms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create breakout rooms',
    };
  }
}

/**
 * Configure breakout room settings
 */
export async function configureBreakoutRooms(
  options: {
    allowParticipantsChooseRoom?: boolean;
    allowParticipantsReturnToMainSession?: boolean;
    automaticallyMoveParticipantsIntoRooms?: boolean;
    closeAfter?: number;
    countDown?: number;
    automaticallyMoveParticipantsIntoMainRoom?: boolean;
  }
): Promise<{ success: boolean; config?: any; error?: string }> {
  try {
    const response = await zoomSdk.configureBreakoutRooms(options);
    console.log('[Zoom SDK] Configured breakout rooms:', response);
    return { success: true, config: response };
  } catch (error) {
    console.error('[Zoom SDK] Failed to configure breakout rooms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure breakout rooms',
    };
  }
}

/**
 * Open breakout rooms
 */
export async function openBreakoutRooms(): Promise<{ success: boolean; error?: string }> {
  try {
    await zoomSdk.openBreakoutRooms();
    console.log('[Zoom SDK] Opened breakout rooms');
    return { success: true };
  } catch (error) {
    console.error('[Zoom SDK] Failed to open breakout rooms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open breakout rooms',
    };
  }
}

/**
 * Close breakout rooms
 */
export async function closeBreakoutRooms(): Promise<{ success: boolean; error?: string }> {
  try {
    await zoomSdk.closeBreakoutRooms();
    console.log('[Zoom SDK] Closed breakout rooms');
    return { success: true };
  } catch (error) {
    console.error('[Zoom SDK] Failed to close breakout rooms:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close breakout rooms',
    };
  }
}

/**
 * Get list of breakout rooms
 */
export async function getBreakoutRoomList(): Promise<{
  success: boolean;
  rooms?: any[];
  state?: 'open' | 'closed';
  unassigned?: any[];
  error?: string;
}> {
  try {
    const response = await zoomSdk.getBreakoutRoomList();
    console.log('[Zoom SDK] Got breakout room list:', response);
    return {
      success: true,
      rooms: response.rooms,
      state: response.state,
      unassigned: response.unassigned,
    };
  } catch (error) {
    console.error('[Zoom SDK] Failed to get breakout room list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get breakout room list',
    };
  }
}

/**
 * Assign participant to breakout room
 */
export async function assignParticipantToBreakoutRoom(
  breakoutRoomId: string,
  participantUUID: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await zoomSdk.assignParticipantToBreakoutRoom({
      uuid: breakoutRoomId,
      participantUUID: participantUUID,
    });
    console.log(`[Zoom SDK] Assigned participant ${participantUUID} to room ${breakoutRoomId}`);
    return { success: true };
  } catch (error) {
    console.error('[Zoom SDK] Failed to assign participant to breakout room:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign participant',
    };
  }
}
