import React, { useState, useEffect } from 'react';
import { useAppStore } from '../state/store';
import { EmailDisplay } from './EmailDisplay';
import { getMeetingParticipants, getWaitingRoomParticipants } from '../sdk/zoom';
import type { Participant, WaitingRoomParticipant } from '../types';

export const RoundSelector: React.FC = () => {
  const parsedRounds = useAppStore((state) => state.parsedRounds);
  const selectedRoundId = useAppStore((state) => state.selectedRoundId);
  const setSelectedRoundId = useAppStore((state) => state.setSelectedRoundId);
  const isProcessing = useAppStore((state) => state.isProcessing);
  const cachedParticipants = useAppStore((state) => state.cachedParticipants);
  const emailOverrides = useAppStore((state) => state.emailOverrides);

  const [meetingParticipants, setMeetingParticipants] = useState<Participant[]>([]);
  const [waitingRoomParticipants, setWaitingRoomParticipants] = useState<WaitingRoomParticipant[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const rounds = Array.from(parsedRounds.entries());
  const selectedRound = selectedRoundId ? parsedRounds.get(selectedRoundId) : null;

  // Load participant status when round is selected
  useEffect(() => {
    if (selectedRound && selectedRound.size > 0) {
      loadParticipantStatus();
    }
  }, [selectedRoundId]);

  const loadParticipantStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const [meetingResult, waitingRoomResult] = await Promise.all([
        getMeetingParticipants(),
        getWaitingRoomParticipants(),
      ]);

      if (meetingResult.success && meetingResult.participants) {
        setMeetingParticipants(meetingResult.participants);
      }

      if (waitingRoomResult.success && waitingRoomResult.participants) {
        setWaitingRoomParticipants(waitingRoomResult.participants);
      }
    } catch (error) {
      console.error('Error loading participant status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Determine participant status
  const getParticipantStatus = (email: string): { 
    status: 'in-meeting' | 'waiting-room' | 'not-present' | 'no-association'; 
    participant?: Participant | WaitingRoomParticipant;
  } => {
    // First, check if email is associated with any participant (cached or overrides)
    const participantWithEmail = cachedParticipants?.find(p => {
      const pEmail = emailOverrides.get(p.participantUUID) || p.email;
      return pEmail?.toLowerCase() === email.toLowerCase();
    });

    if (!participantWithEmail) {
      return { status: 'no-association' };
    }

    // Check if in waiting room
    const inWaitingRoom = waitingRoomParticipants.find(
      p => p.participantUUID === participantWithEmail.participantUUID
    );
    if (inWaitingRoom) {
      return { status: 'waiting-room', participant: inWaitingRoom };
    }

    // Check if in meeting
    const inMeeting = meetingParticipants.find(
      p => p.participantUUID === participantWithEmail.participantUUID
    );
    if (inMeeting) {
      return { status: 'in-meeting', participant: inMeeting };
    }

    return { status: 'not-present' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-meeting':
        return <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">In Meeting</span>;
      case 'waiting-room':
        return <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Waiting Room</span>;
      case 'not-present':
        return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">Not Present</span>;
      case 'no-association':
        return <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">No Association</span>;
      default:
        return null;
    }
  };

  if (rounds.length === 0) {
    return (
      <div className="card">
        <p className="text-gray-500 text-sm">No rounds loaded. Upload a CSV file first.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <label htmlFor="round-select" className="block font-semibold mb-2">
        Select Round
      </label>
      <select
        id="round-select"
        value={selectedRoundId || ''}
        onChange={(e) => setSelectedRoundId(e.target.value || null)}
        disabled={isProcessing}
        className="select"
      >
        <option value="">-- Select a round --</option>
        {rounds.map(([roundId, emails]) => (
          <option key={roundId} value={roundId}>
            {roundId} ({emails.size} conflict{emails.size !== 1 ? 's' : ''})
          </option>
        ))}
      </select>

      {/* Show participants when a round is selected */}
      {selectedRound && selectedRound.size > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Conflicted Participants ({selectedRound.size})
            </h4>
            <button
              onClick={loadParticipantStatus}
              disabled={isLoadingStatus}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {isLoadingStatus ? 'Loading...' : '🔄 Refresh Status'}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <ul className="space-y-1">
              {Array.from(selectedRound).map((email) => {
                const { status, participant } = getParticipantStatus(email);
                return (
                  <li 
                    key={email}
                    className="text-sm px-2 py-1.5 bg-gray-50 rounded hover:bg-gray-100 border border-gray-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <EmailDisplay email={email} showIcon={false} className="text-xs" />
                        {participant && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {participant.displayName}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(status)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
