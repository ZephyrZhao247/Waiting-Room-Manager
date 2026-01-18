import React, { useState } from 'react';
import { useAppStore } from '../state/store';

export const EmailAssociationPanel: React.FC = () => {
  const cachedParticipants = useAppStore((state) => state.cachedParticipants);
  const emailOverrides = useAppStore((state) => state.emailOverrides);
  const setEmailOverride = useAppStore((state) => state.setEmailOverride);
  const removeEmailOverride = useAppStore((state) => state.removeEmailOverride);

  const [selectedUUID, setSelectedUUID] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [showOnlyWithoutEmail, setShowOnlyWithoutEmail] = useState(false);

  const handleAssociate = () => {
    if (!selectedUUID || !emailInput.trim()) return;

    setEmailOverride(selectedUUID, emailInput.trim());
    setEmailInput('');
    setSelectedUUID('');
  };

  const handleRemove = (uuid: string) => {
    removeEmailOverride(uuid);
  };

  const participantsWithoutEmail = cachedParticipants?.filter(p => {
    const hasOverride = emailOverrides.has(p.participantUUID);
    const hasOriginalEmail = !!p.email;
    return !hasOverride && !hasOriginalEmail;
  }) || [];
  
  const displayedParticipants = showOnlyWithoutEmail 
    ? participantsWithoutEmail 
    : cachedParticipants || [];

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Email Association</h2>

      {!cachedParticipants ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Fetch participant emails first
        </div>
      ) : (
        <>
          {/* Association Form */}
          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-sm mb-2">Associate Email Manually</h3>
            
            {/* Filter Toggle */}
            {participantsWithoutEmail.length > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="filter-no-email"
                  checked={showOnlyWithoutEmail}
                  onChange={(e) => setShowOnlyWithoutEmail(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="filter-no-email" className="text-sm text-gray-700">
                  Show only participants without email ({participantsWithoutEmail.length})
                </label>
              </div>
            )}
            
            <div className="space-y-2">
              <select
                value={selectedUUID}
                onChange={(e) => setSelectedUUID(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">Select a participant...</option>
                {displayedParticipants.map(p => {
                  const currentEmail = emailOverrides.get(p.participantUUID) || p.email;
                  const isOverridden = emailOverrides.has(p.participantUUID);
                  return (
                    <option key={p.participantUUID} value={p.participantUUID}>
                      {p.displayName} {currentEmail ? `(${isOverridden ? 'manual: ' : ''}${currentEmail})` : '(no email)'}
                    </option>
                  );
                })}
              </select>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="email@example.com"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <button
                onClick={handleAssociate}
                disabled={!selectedUUID || !emailInput.trim()}
                className="btn btn-primary w-full text-sm"
              >
                Associate Email
              </button>
            </div>
          </div>

          {/* Current Overrides */}
          {emailOverrides.size > 0 && (
            <div className="flex-1 overflow-auto">
              <h3 className="font-semibold text-sm mb-2">
                Manual Associations ({emailOverrides.size})
              </h3>
              <div className="space-y-1">
                {Array.from(emailOverrides.entries()).map(([uuid, email]) => {
                  const participant = cachedParticipants.find(p => p.participantUUID === uuid);
                  return (
                    <div
                      key={uuid}
                      className="border rounded p-2 bg-white flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {participant?.displayName || 'Unknown'}
                        </div>
                        <div className="text-xs text-blue-600 truncate">
                          → {email}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(uuid)}
                        className="ml-2 text-xs text-red-600 hover:text-red-800 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participants without email */}
          {participantsWithoutEmail.length > 0 && emailOverrides.size === 0 && (
            <div className="flex-1 overflow-auto">
              <h3 className="font-semibold text-sm mb-2 text-orange-700">
                Participants Without Email ({participantsWithoutEmail.length})
              </h3>
              <div className="space-y-1">
                {participantsWithoutEmail.map(p => (
                  <div key={p.participantUUID} className="text-sm text-gray-700 py-1 border-b">
                    {p.displayName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
