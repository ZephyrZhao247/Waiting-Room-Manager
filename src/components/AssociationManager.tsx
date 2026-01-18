import React, { useRef, useState } from 'react';
import { useAppStore } from '../state/store';
import { showNotification, getMeetingParticipants } from '../sdk/zoom';

export const AssociationManager: React.FC = () => {
  const emailOverrides = useAppStore((state) => state.emailOverrides);
  const cachedParticipants = useAppStore((state) => state.cachedParticipants);
  const setEmailOverride = useAppStore((state) => state.setEmailOverride);
  const setCachedParticipants = useAppStore((state) => state.setCachedParticipants);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportJson, setExportJson] = useState('');

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
      <div className="flex items-center gap-2">
        <button
          onClick={handleDumpAssociations}
          disabled={totalAssociations === 0}
          className="btn btn-secondary text-sm"
          title="Export email associations to JSON file"
        >
          💾 Export Associations {totalAssociations > 0 && `(${totalAssociations})`}
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
          📂 Import Associations
        </button>
      </div>

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
