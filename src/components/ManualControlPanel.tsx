import React, { useState } from 'react';
import { useAppStore } from '../state/store';
import { getMeetingParticipants, moveToWaitingRoom, showNotification, getWaitingRoomParticipants, admitFromWaitingRoom } from '../sdk/zoom';
import type { Participant, WaitingRoomParticipant } from '../types';
import { EmailDisplay } from './EmailDisplay';

export const ManualControlPanel: React.FC = () => {
  const isProcessing = useAppStore((state) => state.isProcessing);
  const setIsProcessing = useAppStore((state) => state.setIsProcessing);
  const addActionLog = useAppStore((state) => state.addActionLog);
  const emailOverrides = useAppStore((state) => state.emailOverrides);
  const emailToName = useAppStore((state) => state.emailToName);
  const cachedParticipants = useAppStore((state) => state.cachedParticipants);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedUUIDs, setSelectedUUIDs] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  
  const [waitingRoomParticipants, setWaitingRoomParticipants] = useState<WaitingRoomParticipant[]>([]);
  const [isRefreshingWaitingRoom, setIsRefreshingWaitingRoom] = useState(false);
  const [lastWaitingRoomRefresh, setLastWaitingRoomRefresh] = useState<number | null>(null);

  const handleRefreshParticipants = async () => {
    setIsRefreshing(true);
    try {
      const result = await getMeetingParticipants();
      if (result.success && result.participants) {
        setParticipants(result.participants);
        setLastRefreshTime(Date.now());
        await showNotification(
          `✓ Refreshed ${result.participants.length} participants`,
          'info'
        );
      } else {
        throw new Error(result.error || 'Failed to get participants');
      }
    } catch (error) {
      console.error('Error refreshing participants:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to refresh'}`,
        'error'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshWaitingRoom = async () => {
    setIsRefreshingWaitingRoom(true);
    try {
      const result = await getWaitingRoomParticipants();
      if (result.success && result.participants) {
        setWaitingRoomParticipants(result.participants);
        setLastWaitingRoomRefresh(Date.now());
        await showNotification(
          `✓ Found ${result.participants.length} participant(s) in waiting room`,
          'info'
        );
      } else {
        // Waiting room may not be supported
        if (result.error?.includes('10240')) {
          await showNotification('Waiting room not enabled for this meeting', 'warning');
          setWaitingRoomParticipants([]);
        } else {
          throw new Error(result.error || 'Failed to get waiting room participants');
        }
      }
    } catch (error) {
      console.error('Error refreshing waiting room:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to refresh waiting room'}`,
        'error'
      );
    } finally {
      setIsRefreshingWaitingRoom(false);
    }
  };

  const handleAdmitParticipant = async (uuid: string) => {
    setIsProcessing(true);
    try {
      const result = await admitFromWaitingRoom(uuid);
      if (result.success) {
        await showNotification('Participant admitted from waiting room', 'info');
        addActionLog({
          type: 'admit_from_waiting_room',
          roundId: 'manual',
          participantUUID: uuid,
          status: 'success',
        });
        // Refresh waiting room list
        await handleRefreshWaitingRoom();
      } else {
        throw new Error(result.error || 'Failed to admit participant');
      }
    } catch (error) {
      console.error('Error admitting participant:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Failed to admit'}`,
        'error'
      );
      addActionLog({
        type: 'admit_from_waiting_room',
        roundId: 'manual',
        participantUUID: uuid,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSelection = (uuid: string) => {
    const newSet = new Set(selectedUUIDs);
    if (newSet.has(uuid)) {
      newSet.delete(uuid);
    } else {
      newSet.add(uuid);
    }
    setSelectedUUIDs(newSet);
  };

  const handleSelectAll = () => {
    if (selectedUUIDs.size === participants.length) {
      setSelectedUUIDs(new Set());
    } else {
      setSelectedUUIDs(new Set(participants.map(p => p.participantUUID)));
    }
  };

  const handleMoveSelected = async () => {
    if (selectedUUIDs.size === 0) {
      await showNotification('Please select participants to move', 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      const selectedParticipants = participants.filter(p =>
        selectedUUIDs.has(p.participantUUID)
      );

      let successCount = 0;
      for (const participant of selectedParticipants) {
        const result = await moveToWaitingRoom(participant.participantUUID);
        
        if (result.success) {
          successCount++;
          addActionLog({
            type: 'move_to_waiting_room',
            roundId: 'manual',
            participantUUID: participant.participantUUID,
            status: 'success',
          });
        } else {
          addActionLog({
            type: 'move_to_waiting_room',
            roundId: 'manual',
            participantUUID: participant.participantUUID,
            status: 'failed',
            error: result.error,
          });
        }

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await showNotification(
        `Moved ${successCount}/${selectedUUIDs.size} participants to waiting room`,
        successCount === selectedUUIDs.size ? 'info' : 'warning'
      );

      setSelectedUUIDs(new Set());
      
      // Refresh participant list after moving
      await handleRefreshParticipants();
    } catch (error) {
      console.error('Error moving participants:', error);
      await showNotification(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Get email for participant (from cache or overrides)
  const getParticipantEmail = (uuid: string): string | undefined => {
    const override = emailOverrides.get(uuid);
    if (override) return override;
    
    const cached = cachedParticipants?.find(p => p.participantUUID === uuid);
    return cached?.email;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Manual Participant Control</h2>
        <div className="flex items-center gap-2">
          {lastRefreshTime && (
            <span className="text-xs text-gray-500">
              Last refresh: {new Date(lastRefreshTime).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefreshParticipants}
            disabled={isRefreshing || isProcessing}
            className="btn btn-secondary text-sm"
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh Participants'}
          </button>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Click "Refresh Participants" to load the current meeting participants
        </div>
      ) : (
        <>
          {/* Action Buttons */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleSelectAll}
              disabled={isProcessing}
              className="btn btn-secondary text-sm"
            >
              {selectedUUIDs.size === participants.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleMoveSelected}
              disabled={isProcessing || selectedUUIDs.size === 0}
              className="btn btn-primary"
            >
              Move Selected to Waiting Room ({selectedUUIDs.size})
            </button>
          </div>

          {/* Participant Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {participants.map((participant) => {
              const email = getParticipantEmail(participant.participantUUID);
              const hasOverride = emailOverrides.has(participant.participantUUID);
              
              return (
                <div
                  key={participant.participantUUID}
                  className={`border rounded p-3 hover:bg-gray-50 cursor-pointer ${
                    selectedUUIDs.has(participant.participantUUID) ? 'bg-blue-50 border-blue-400' : ''
                  }`}
                  onClick={() => handleToggleSelection(participant.participantUUID)}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedUUIDs.has(participant.participantUUID)}
                      onChange={() => {}}
                      className="mt-1 mr-2 flex-shrink-0"
                      disabled={isProcessing}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {participant.displayName}
                        {participant.role === 'coHost' && (
                          <span className="ml-1 text-xs text-blue-600">(Co-Host)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate font-mono">
                        {participant.participantUUID}
                      </div>
                      {email && (
                        <div className="text-xs text-green-700 truncate mt-1">
                          <EmailDisplay email={email} showIcon={true} className="inline" />
                          {hasOverride && <span className="text-blue-600 ml-1">(manual)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Total: {participants.length} participants • Selected: {selectedUUIDs.size}
          </div>
        </>
      )}

      {/* Waiting Room Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Waiting Room</h3>
          <div className="flex items-center gap-2">
            {lastWaitingRoomRefresh && (
              <span className="text-xs text-gray-500">
                Last refresh: {new Date(lastWaitingRoomRefresh).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefreshWaitingRoom}
              disabled={isRefreshingWaitingRoom || isProcessing}
              className="btn btn-secondary text-sm"
            >
              {isRefreshingWaitingRoom ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {waitingRoomParticipants.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded">
            {lastWaitingRoomRefresh 
              ? 'No participants in waiting room' 
              : 'Click "Refresh" to check waiting room'}
          </div>
        ) : (
          <div className="space-y-2">
            {waitingRoomParticipants.map((participant) => (
              <div
                key={participant.participantUUID}
                className="flex items-center justify-between p-3 border border-yellow-300 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {participant.displayName}
                  </div>
                  <div className="text-xs text-gray-500 truncate font-mono">
                    {participant.participantUUID}
                  </div>
                </div>
                <button
                  onClick={() => handleAdmitParticipant(participant.participantUUID)}
                  disabled={isProcessing}
                  className="btn btn-success text-sm ml-2"
                >
                  Admit
                </button>
              </div>
            ))}
            <div className="mt-2 text-sm text-gray-600">
              Total in waiting room: {waitingRoomParticipants.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

