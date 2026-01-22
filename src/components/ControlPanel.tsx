import React, { useState, useEffect } from 'react';
import { useAppStore } from '../state/store';
import { getParticipantsWithEmails, showNotification, getBreakoutRoomList, setOnEmailUpdatedCallback } from '../sdk/zoom';
import { matchParticipants, getConflictEmailsForRound } from '../operations/matching';
import {
  sendParticipantsToBreakoutRooms,
  returnParticipantsFromBreakoutRooms,
} from '../operations/breakoutRoom';
import type { ParticipantWithEmail, MatchResult } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

export const ControlPanel: React.FC = () => {
  const selectedRoundId = useAppStore((state) => state.selectedRoundId);
  const parsedRounds = useAppStore((state) => state.parsedRounds);
  const emailToName = useAppStore((state) => state.emailToName);
  const isProcessing = useAppStore((state) => state.isProcessing);
  const setIsProcessing = useAppStore((state) => state.setIsProcessing);
  const fallbackMode = useAppStore((state) => state.fallbackMode);
  const setFallbackMode = useAppStore((state) => state.setFallbackMode);
  const startRound = useAppStore((state) => state.startRound);
  const endRound = useAppStore((state) => state.endRound);
  const addMovedParticipant = useAppStore((state) => state.addMovedParticipant);
  const updateRoundStats = useAppStore((state) => state.updateRoundStats);
  const getMovedParticipants = useAppStore((state) => state.getMovedParticipants);
  const addActionLog = useAppStore((state) => state.addActionLog);
  const cachedParticipants = useAppStore((state) => state.cachedParticipants);
  const lastEmailFetchTime = useAppStore((state) => state.lastEmailFetchTime);
  const setCachedParticipants = useAppStore((state) => state.setCachedParticipants);
  const clearCachedParticipants = useAppStore((state) => state.clearCachedParticipants);
  const updateParticipantEmail = useAppStore((state) => state.updateParticipantEmail);
  const emailOverrides = useAppStore((state) => state.emailOverrides);

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [selectedFallbackUUIDs, setSelectedFallbackUUIDs] = useState<Set<string>>(new Set());
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [emailFetchProgress, setEmailFetchProgress] = useState<{ received: number; total: number } | null>(null);
  const [breakoutRoomCount, setBreakoutRoomCount] = useState<number>(0);
  
  // Confirmation dialog state
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [participantsToMove, setParticipantsToMove] = useState<ParticipantWithEmail[]>([]);
  const [participantsToAdmit, setParticipantsToAdmit] = useState<ParticipantWithEmail[]>([]);

  // Set up callback to update participant emails as they arrive (even after timeout)
  useEffect(() => {
    setOnEmailUpdatedCallback((participantUUID, email) => {
      console.log('[ControlPanel] Late email received, updating store:', participantUUID, email);
      updateParticipantEmail(participantUUID, email);
    });
    
    return () => {
      setOnEmailUpdatedCallback(null);
    };
  }, [updateParticipantEmail]);

  // Update breakout room count when round changes
  const updateBreakoutRoomCount = async () => {
    try {
      const result = await getBreakoutRoomList();
      if (result.success && result.rooms) {
        let count = 0;
        for (const room of result.rooms) {
          count += room.participants?.length || 0;
        }
        setBreakoutRoomCount(count);
      }
    } catch (error) {
      console.error('Error fetching breakout room count:', error);
    }
  };

  // Update breakout room count when round changes or after operations
  useEffect(() => {
    if (selectedRoundId && movedParticipants.size > 0) {
      updateBreakoutRoomCount();
    }
  }, [selectedRoundId]);

  const handleFetchEmails = async () => {
    setIsFetchingEmails(true);
    setEmailFetchProgress(null);
    
    try {
      await showNotification('Requesting participant emails... Consent dialogs will appear for all participants.', 'info');
      
      const participantsResult = await getParticipantsWithEmails((received, total) => {
        setEmailFetchProgress({ received, total });
      });
      
      if (!participantsResult.success || !participantsResult.participants) {
        throw new Error(participantsResult.error || 'Failed to get participants');
      }

      setCachedParticipants(participantsResult.participants);
      
      const emailCount = participantsResult.participants.filter(p => p.email).length;
      const message = participantsResult.timedOut
        ? `⏱ Timed out: Received ${emailCount} emails from ${participantsResult.participants.length} participants`
        : `✓ Fetched ${participantsResult.participants.length} participants (${emailCount} with emails)`;
      
      await showNotification(message, participantsResult.timedOut ? 'warning' : 'info');
    } catch (error) {
      console.error('Error fetching emails:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to fetch emails'}`,
        'error'
      );
    } finally {
      setIsFetchingEmails(false);
      setEmailFetchProgress(null);
    }
  };

  const handleStartRound = async () => {
    if (!selectedRoundId) {
      await showNotification('Please select a round first', 'warning');
      return;
    }

    // Check if we have cached participants
    if (!cachedParticipants) {
      await showNotification('Please fetch participant emails first', 'warning');
      return;
    }

    setIsProcessing(true);
    setProgress(null);
    setMatchResult(null);
    setSelectedFallbackUUIDs(new Set());

    try {
      // Apply email overrides to cached participants
      const participantsWithOverrides = cachedParticipants.map(p => ({
        ...p,
        email: emailOverrides.get(p.participantUUID) || p.email,
      }));

      // Step 1: Get conflict emails for selected round
      const conflictEmails = getConflictEmailsForRound(selectedRoundId, parsedRounds);
      if (conflictEmails.size === 0) {
        await showNotification('No conflicts defined for this round', 'warning');
        setIsProcessing(false);
        return;
      }

      // Step 2: Match participants
      const match = matchParticipants(conflictEmails, participantsWithOverrides);
      setMatchResult(match);

      // Show confirmation dialog if there are participants to move
      if (match.matched.length > 0) {
        setParticipantsToMove(match.matched);
        setShowStartDialog(true);
        setIsProcessing(false);  // Allow user interaction
        return;
      } else {
        await showNotification('No participants matched for this round', 'warning');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error starting round:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to start round'}`,
        'error'
      );
      setIsProcessing(false);
    }
  };

  const confirmStartRound = async () => {
    if (!selectedRoundId) return;
    
    setShowStartDialog(false);
    setIsProcessing(true);

    try {
      // Send matched participants to breakout room
      startRound(selectedRoundId);

      const results = await sendParticipantsToBreakoutRooms(
        participantsToMove,
        selectedRoundId,
        (completed, total) => setProgress({ completed, total })
      );

      // Record moved participants
      let successCount = 0;
      for (const result of results) {
        if (result.success) {
          addMovedParticipant(selectedRoundId, result.participantUUID);
          successCount++;

          addActionLog({
            type: 'move_to_waiting_room',
            roundId: selectedRoundId,
            participantUUID: result.participantUUID,
            status: 'success',
          });
        } else {
          addActionLog({
            type: 'move_to_waiting_room',
            roundId: selectedRoundId,
            participantUUID: result.participantUUID,
            status: 'failed',
            error: result.error,
          });
        }
      }

      updateRoundStats(selectedRoundId, successCount, 0);

      await showNotification(
        `Round started: ${successCount}/${participantsToMove.length} participants sent to breakout room`,
        successCount === participantsToMove.length ? 'info' : 'warning'
      );

      setProgress(null);
      // Update breakout room count
      await updateBreakoutRoomCount();
    } catch (error) {
      console.error('Error confirming start round:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to send participants to breakout room'}`,
        'error'
      );
    } finally {
      setIsProcessing(false);
      setParticipantsToMove([]);
    }
  };

  const handleEndRound = async () => {
    if (!selectedRoundId) {
      await showNotification('Please select a round first', 'warning');
      return;
    }

    const movedParticipants = getMovedParticipants(selectedRoundId);
    if (movedParticipants.size === 0) {
      await showNotification('No participants were moved for this round', 'warning');
      return;
    }
    
    // Get participant details for confirmation
    if (!cachedParticipants) {
      await showNotification('Participant cache not available', 'warning');
      return;
    }
    
    const participantsToAdmitList = cachedParticipants.filter(p => 
      movedParticipants.has(p.participantUUID)
    );
    
    setParticipantsToAdmit(participantsToAdmitList);
    setShowEndDialog(true);
  };

  const confirmEndRound = async () => {
    if (!selectedRoundId) return;
    
    setShowEndDialog(false);
    setIsProcessing(true);
    setProgress(null);

    try {
      const movedParticipants = getMovedParticipants(selectedRoundId);

      // Return all participants from breakout rooms
      const result = await returnParticipantsFromBreakoutRooms();

      if (!result.success) {
        throw new Error(result.error || 'Failed to close breakout rooms');
      }

      const successCount = result.participantCount || 0;

      // Log success for all moved participants
      movedParticipants.forEach(uuid => {
        addActionLog({
          type: 'admit_from_waiting_room',
          roundId: selectedRoundId,
          participantUUID: uuid,
          status: 'success',
        });
      });

      endRound(selectedRoundId);
      updateRoundStats(
        selectedRoundId,
        movedParticipants.size,
        successCount
      );

      await showNotification(
        `Round ended: ${successCount} participants returned from breakout room`,
        'info'
      );

      setProgress(null);
      setMatchResult(null);
      setParticipantsToAdmit([]);
      // Update breakout room count
      await updateBreakoutRoomCount();
    } catch (error) {
      console.error('Error ending round:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveFallbackParticipants = async () => {
    if (!selectedRoundId || selectedFallbackUUIDs.size === 0) {
      await showNotification('Please select participants to move', 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      const participantsToMove = matchResult?.noEmail.filter(p =>
        selectedFallbackUUIDs.has(p.participantUUID)
      ) || [];

      if (participantsToMove.length === 0) return;

      const results = await sendParticipantsToBreakoutRooms(
        participantsToMove,
        selectedRoundId,
        (completed, total) => setProgress({ completed, total })
      );

      let successCount = 0;
      for (const result of results) {
        if (result.success) {
          addMovedParticipant(selectedRoundId, result.participantUUID);
          successCount++;

          addActionLog({
            type: 'move_to_waiting_room',
            roundId: selectedRoundId,
            participantUUID: result.participantUUID,
            status: 'success',
          });
        } else {
          addActionLog({
            type: 'move_to_waiting_room',
            roundId: selectedRoundId,
            participantUUID: result.participantUUID,
            status: 'failed',
            error: result.error,
          });
        }
      }

      const movedCount = getMovedParticipants(selectedRoundId).size;
      updateRoundStats(selectedRoundId, movedCount, 0);

      await showNotification(
        `Moved ${successCount}/${participantsToMove.length} fallback participants`,
        'info'
      );

      setSelectedFallbackUUIDs(new Set());
      setProgress(null);
    } catch (error) {
      console.error('Error moving fallback participants:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFallbackSelection = (uuid: string) => {
    const newSet = new Set(selectedFallbackUUIDs);
    if (newSet.has(uuid)) {
      newSet.delete(uuid);
    } else {
      newSet.add(uuid);
    }
    setSelectedFallbackUUIDs(newSet);
  };

  const movedParticipants = selectedRoundId ? getMovedParticipants(selectedRoundId) : new Set();

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Controls</h2>

      {/* Email Cache Status */}
      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-blue-900">
            {cachedParticipants ? (
              <>
                ✓ {cachedParticipants.length} participants cached ({cachedParticipants.filter(p => p.email).length} with emails)
              </>
            ) : (
              '⚠️ No participant data - fetch emails first'
            )}
          </div>
          {cachedParticipants && (
            <button
              onClick={clearCachedParticipants}
              className="text-xs text-blue-700 hover:text-blue-900 underline"
              disabled={isProcessing || isFetchingEmails}
            >
              Clear
            </button>
          )}
        </div>
        {lastEmailFetchTime && (
          <div className="text-xs text-blue-700">
            Last fetched: {new Date(lastEmailFetchTime).toLocaleTimeString()}
          </div>
        )}
        <button
          onClick={handleFetchEmails}
          disabled={isProcessing || isFetchingEmails}
          className="btn btn-secondary w-full mt-2 text-sm"
        >
          {isFetchingEmails ? 'Requesting Emails...' : cachedParticipants ? 'Refresh Emails' : 'Fetch Participant Emails'}
        </button>
        {!cachedParticipants && (
          <p className="text-xs text-blue-700 mt-2">
            This will ask all participants to share their email address (one-time consent dialog)
          </p>
        )}
        {emailFetchProgress && (
          <div className="mt-2">
            <div className="text-xs font-medium text-blue-900 mb-1">
              Receiving emails: {emailFetchProgress.received} / {emailFetchProgress.total}
            </div>
            <div className="w-full bg-blue-200 rounded h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded transition-all"
                style={{ width: `${(emailFetchProgress.received / emailFetchProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Waiting for participants to respond to consent dialogs...
            </p>
          </div>
        )}
      </div>

      {/* Fallback Mode Toggle */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={fallbackMode}
            onChange={(e) => setFallbackMode(e.target.checked)}
            disabled={isProcessing}
            className="mr-2"
          />
          <span className="text-sm font-medium">
            Fallback Mode: Match by display name when email missing
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mb-4">
        <button
          onClick={handleStartRound}
          disabled={!selectedRoundId || isProcessing || !cachedParticipants}
          className="btn btn-primary w-full"
          title={!cachedParticipants ? 'Fetch participant emails first' : ''}
        >
          📤 Send to Breakout
        </button>

        <button
          onClick={handleEndRound}
          disabled={!selectedRoundId || isProcessing || movedParticipants.size === 0}
          className="btn btn-success w-full"
        >
          📥 Return from Breakout
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="text-sm font-medium text-blue-900 mb-1">
            Processing: {progress.completed} / {progress.total}
          </div>
          <div className="w-full bg-blue-200 rounded h-2">
            <div
              className="bg-blue-600 h-2 rounded transition-all"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Match Result */}
      {matchResult && (
        <div className="flex-1 overflow-auto">
          <h3 className="font-semibold mb-2">Actions Summary</h3>

          {/* Matched Participants */}
          {matchResult.matched.length > 0 && (
            <div className="mb-3 p-3 bg-green-50 rounded">
              <h4 className="font-medium text-green-900 mb-1">
                ✓ Matched ({matchResult.matched.length})
              </h4>
              <div className="text-sm text-green-800 max-h-32 overflow-auto">
                {matchResult.matched.map((p) => (
                  <div key={p.participantUUID} className="py-1 border-b border-green-200 last:border-0">
                    {p.displayName} ({p.email})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Found */}
          {matchResult.notFound.length > 0 && (
            <div className="mb-3 p-3 bg-yellow-50 rounded">
              <h4 className="font-medium text-yellow-900 mb-1">
                ! Not in Meeting ({matchResult.notFound.length})
              </h4>
              <div className="text-sm text-yellow-800 max-h-24 overflow-auto">
                {matchResult.notFound.map((email, i) => (
                  <div key={i} className="py-1 border-b border-yellow-200 last:border-0">
                    {email}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Email (Fallback) */}
          {matchResult.noEmail.length > 0 && fallbackMode && (
            <div className="mb-3 p-3 bg-orange-50 rounded">
              <h4 className="font-medium text-orange-900 mb-2">
                ? No Email - Select Manually ({matchResult.noEmail.length})
              </h4>
              <div className="text-sm max-h-48 overflow-auto space-y-1 mb-2">
                {matchResult.noEmail.map((p) => (
                  <label key={p.participantUUID} className="flex items-center cursor-pointer hover:bg-orange-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedFallbackUUIDs.has(p.participantUUID)}
                      onChange={() => toggleFallbackSelection(p.participantUUID)}
                      className="mr-2"
                    />
                    <span>{p.displayName}</span>
                  </label>
                ))}
              </div>
              {selectedFallbackUUIDs.size > 0 && (
                <button
                  onClick={handleMoveFallbackParticipants}
                  disabled={isProcessing}
                  className="btn btn-primary btn-sm w-full"
                >
                  Move Selected ({selectedFallbackUUIDs.size})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Round Status */}
      {selectedRoundId && movedParticipants.size > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-blue-900">Current Round Status</h4>
            <button
              onClick={updateBreakoutRoomCount}
              className="text-xs text-blue-600 hover:text-blue-800"
              disabled={isProcessing}
            >
              🔄 Refresh
            </button>
          </div>
          <div className="text-sm text-blue-800">
            {breakoutRoomCount} participant{breakoutRoomCount !== 1 ? 's' : ''} currently in breakout room
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showStartDialog}
        title={`Start Round: ${selectedRoundId}`}
        message={`Are you sure you want to send these participants to a breakout room?`}
        confirmLabel="Send to Breakout Room"
        cancelLabel="Cancel"
        onConfirm={confirmStartRound}
        onCancel={() => {
          setShowStartDialog(false);
          setParticipantsToMove([]);
        }}
        participants={participantsToMove.map(p => ({
          name: `${p.displayName}${p.role === 'coHost' ? ' (Co-Host)' : ''}`,
          email: p.email ? `${emailToName.get(p.email) || ''} ${emailToName.get(p.email) ? `(${p.email})` : p.email}`.trim() : undefined,
        }))}
      />

      <ConfirmDialog
        isOpen={showEndDialog}
        title={`End Round: ${selectedRoundId}`}
        message={`Are you sure you want to return these participants from the breakout room?`}
        confirmLabel="Return to Main Meeting"
        cancelLabel="Cancel"
        onConfirm={confirmEndRound}
        onCancel={() => {
          setShowEndDialog(false);
          setParticipantsToAdmit([]);
        }}
        participants={participantsToAdmit.map(p => ({
          name: `${p.displayName}${p.role === 'coHost' ? ' (Co-Host)' : ''}`,
          email: p.email ? `${emailToName.get(p.email) || ''} ${emailToName.get(p.email) ? `(${p.email})` : p.email}`.trim() : undefined,
        }))}
      />
    </div>
  );
};
