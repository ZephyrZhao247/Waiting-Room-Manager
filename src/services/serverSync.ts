// Server-side association storage service
import { getServerUrl } from '../config/server';
import { getMeetingContext } from '../sdk/zoom';

/**
 * Get current meeting ID
 */
async function getMeetingId(): Promise<string> {
  try {
    const context = await getMeetingContext();
    if (context.success && context.meetingId) {
      return context.meetingId;
    }
    throw new Error('Failed to get meeting ID');
  } catch (error) {
    console.error('[Server Sync] Error getting meeting ID:', error);
    throw error;
  }
}

/**
 * Save associations to server
 */
export async function saveAssociationsToServer(
  associations: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const meetingId = await getMeetingId();
    const serverUrl = getServerUrl().replace(/\/$/, ''); // Remove trailing slash

    const response = await fetch(`${serverUrl}/api/associations/${meetingId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ associations }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} ${errorText}`);
    }

    console.log('[Server Sync] Saved associations to server');
    return { success: true };
  } catch (error) {
    console.error('[Server Sync] Error saving associations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to server',
    };
  }
}

/**
 * Load associations from server
 */
export async function loadAssociationsFromServer(): Promise<{
  success: boolean;
  associations?: Record<string, string>;
  error?: string;
}> {
  try {
    const meetingId = await getMeetingId();
    const serverUrl = getServerUrl().replace(/\/$/, ''); // Remove trailing slash

    const response = await fetch(`${serverUrl}/api/associations/${meetingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No associations found for this meeting
        return { success: true, associations: {} };
      }
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Server Sync] Loaded associations from server');
    return { success: true, associations: data.associations || {} };
  } catch (error) {
    console.error('[Server Sync] Error loading associations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load from server',
    };
  }
}

/**
 * Check if server is reachable
 */
export async function checkServerConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const serverUrl = getServerUrl().replace(/\/$/, ''); // Remove trailing slash
    const response = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[Server Sync] Server connection check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Server unreachable',
    };
  }
}
