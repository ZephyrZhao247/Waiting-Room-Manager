import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../state/store';
import { showNotification, getMeetingParticipants } from '../sdk/zoom';
import { saveAssociationsToServer, loadAssociationsFromServer, checkServerConnection } from '../services/serverSync';
import { getServerUrl, setServerUrl } from '../config/server';

export const AssociationManager: React.FC = () => {
  const emailOverrides = useAppStore((state) => state.emailOverrides);
  const cachedParticipants = useAppStore((state) => state.cachedParticipants);
  const setEmailOverride = useAppStore((state) => state.setEmailOverride);
  const setCachedParticipants = useAppStore((state) => state.setCachedParticipants);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportJson, setExportJson] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getServerUrl());
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check server connection on mount and when URL changes
  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    const result = await checkServerConnection();
    setServerConnected(result.success);
  };

  const handleSaveServerUrl = () => {
    setServerUrl(serverUrlInput);
    setShowServerConfig(false);
    checkServer();
    showNotification('Server URL saved', 'info');
  };

  const handleDumpAssociations = () => {
    const associations: Record<string, string> = {};
    
    // Include all cached participant emails
    if (cachedParticipants) {
      cachedParticipants.forEach((participant) => {
        if (participant.email) {
          associations[participant.participantUUID] = participant.email;
        }
      });
    }
    
    // Overwrite with manual overrides (they take precedence)
    emailOverrides.forEach((email, uuid) => {
      associations[uuid] = email;
    });

    const totalAssociations = Object.keys(associations).length;
    
    if (totalAssociations === 0) {
      showNotification('No email associations to export', 'warning');
      return;
    }

    const dataStr = JSON.stringify(associations, null, 2);
    setExportJson(dataStr);
    setShowExportDialog(true);
  };

  const handleRestoreAssociations = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const associations: Record<string, string> = JSON.parse(content);

      // Step 1: Fetch current meeting participants (same as Refresh Participants)
      await showNotification('Fetching current participants...', 'info');
      const participantsResult = await getMeetingParticipants();
      
      if (!participantsResult.success || !participantsResult.participants) {
        throw new Error(participantsResult.error || 'Failed to get current participants');
      }

      const currentParticipants = participantsResult.participants;
      const currentUUIDs = new Set(currentParticipants.map(p => p.participantUUID));

      // Step 2: Only apply associations for UUIDs that exist in the current meeting
      let appliedCount = 0;
      let skippedCount = 0;
      
      Object.entries(associations).forEach(([uuid, email]) => {
        if (!uuid || !email) return;
        
        // Only apply if the UUID exists in the current meeting
        if (currentUUIDs.has(uuid)) {
          // Check if this UUID already has a manual override
          // If it does, don't overwrite it (preserve manual associations)
          if (!emailOverrides.has(uuid)) {
            setEmailOverride(uuid, email);
            appliedCount++;
          } else {
            // UUID already has a manual association, skip it
            skippedCount++;
          }
        } else {
          // UUID not in current meeting, skip
          skippedCount++;
        }
      });

      // Step 3: Update cachedParticipants with current meeting data
      // This ensures we have the latest UUIDs and screen names
      setCachedParticipants(currentParticipants);

      const message = appliedCount > 0 
        ? `✓ Applied ${appliedCount} association(s)${skippedCount > 0 ? `, skipped ${skippedCount}` : ''}`
        : `⚠ No associations applied (${skippedCount} skipped - not in meeting or already mapped)`;
      
      await showNotification(message, appliedCount > 0 ? 'info' : 'warning');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error restoring associations:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to restore'}`,
        'error'
      );
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveToServer = async () => {
    setIsSyncing(true);
    try {
      const associations: Record<string, string> = {};
      
      // Include all cached participant emails
      if (cachedParticipants) {
        cachedParticipants.forEach((participant) => {
          if (participant.email) {
            associations[participant.participantUUID] = participant.email;
          }
        });
      }
      
      // Overwrite with manual overrides (they take precedence)
      emailOverrides.forEach((email, uuid) => {
        associations[uuid] = email;
      });

      const result = await saveAssociationsToServer(associations);
      if (result.success) {
        await showNotification('✓ Saved associations to server', 'info');
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving to server:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to save to server'}`,
        'error'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromServer = async () => {
    setIsSyncing(true);
    try {
      // Step 1: Fetch current meeting participants
      await showNotification('Loading from server...', 'info');
      const participantsResult = await getMeetingParticipants();
      
      if (!participantsResult.success || !participantsResult.participants) {
        throw new Error(participantsResult.error || 'Failed to get current participants');
      }

      const currentParticipants = participantsResult.participants;
      const currentUUIDs = new Set(currentParticipants.map(p => p.participantUUID));

      // Step 2: Load associations from server
      const result = await loadAssociationsFromServer();
      if (!result.success || !result.associations) {
        throw new Error(result.error || 'Failed to load from server');
      }

      // Step 3: Apply associations only for current participants
      let appliedCount = 0;
      let skippedCount = 0;
      
      Object.entries(result.associations).forEach(([uuid, email]) => {
        if (!uuid || !email) return;
        
        // Only apply if the UUID exists in the current meeting
        if (currentUUIDs.has(uuid)) {
          if (!emailOverrides.has(uuid)) {
            setEmailOverride(uuid, email);
            appliedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      });

      // Step 4: Update cachedParticipants
      setCachedParticipants(currentParticipants);

      const message = appliedCount > 0 
        ? `✓ Loaded ${appliedCount} association(s) from server${skippedCount > 0 ? `, skipped ${skippedCount}` : ''}`
        : `⚠ No associations loaded (${skippedCount} skipped)`;
      
      await showNotification(message, appliedCount > 0 ? 'info' : 'warning');
    } catch (error) {
      console.error('Error loading from server:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to load from server'}`,
        'error'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate total associations for button state
  const totalAssociations = (() => {
    const emailsSet = new Set<string>();
    
    // Count cached participant emails
    if (cachedParticipants) {
      cachedParticipants.forEach((participant) => {
        if (participant.email) {
          emailsSet.add(participant.participantUUID);
        }
      });
    }
    
    // Add manual overrides
    emailOverrides.forEach((_, uuid) => {
      emailsSet.add(uuid);
    });
    
    return emailsSet.size;
  })();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      showNotification('Copied to clipboard!', 'info');
    } catch (error) {
      console.error('Failed to copy:', error);
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Local File Import/Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDumpAssociations}
            disabled={totalAssociations === 0}
            className="btn btn-secondary text-sm"
            title="Export email associations to JSON"
          >
            💾 Export {totalAssociations > 0 && `(${totalAssociations})`}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleRestoreAssociations}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary text-sm"
            title="Import email associations from JSON file"
          >
            📂 Import
          </button>
        </div>

        {/* Server Sync */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToServer}
            disabled={totalAssociations === 0 || isSyncing}
            className="btn btn-secondary text-sm"
            title={serverConnected === false ? 'Server not connected' : 'Save associations to server'}
          >
            {isSyncing ? '⏳' : '☁️'} Save to Server
          </button>
          
          <button
            onClick={handleLoadFromServer}
            disabled={isSyncing}
            className="btn btn-secondary text-sm"
            title={serverConnected === false ? 'Server not connected' : 'Load associations from server'}
          >
            {isSyncing ? '⏳' : '☁️'} Load from Server
          </button>

          <button
            onClick={() => setShowServerConfig(true)}
            className="btn btn-secondary text-sm"
            title="Configure server URL"
          >
            ⚙️
          </button>
        </div>

        {/* Server Status Indicator */}
        {serverConnected !== null && (
          <div className="text-xs">
            {serverConnected ? (
              <span className="text-green-600">✓ Server connected</span>
            ) : (
              <span className="text-red-600">✗ Server not connected</span>
            )}
          </div>
        )}
      </div>

      {/* Server Config Dialog */}
      {showServerConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Server Configuration</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Server URL</label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="http://localhost:3001"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the URL of your backend server for association storage
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowServerConfig(false);
                  setServerUrlInput(getServerUrl());
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveServerUrl}
                className="btn btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Export Email Associations</h3>
              <p className="text-sm text-gray-600 mt-1">
                Copy this JSON content and save it to a file for later import
              </p>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <textarea
                readOnly
                value={exportJson}
                className="w-full h-full min-h-[400px] font-mono text-sm p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              {/* <button
                onClick={handleCopyToClipboard}
                className="btn btn-primary"
              >
                📋 Copy to Clipboard
              </button> */}
              <button
                onClick={() => setShowExportDialog(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
