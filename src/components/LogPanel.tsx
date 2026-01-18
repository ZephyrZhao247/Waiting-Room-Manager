import React, { useMemo, useState } from 'react';
import { useAppStore } from '../state/store';
import { formatTimestamp } from '../utils';
import type { ActionLogEntry, ActionStatus } from '../types';

export const LogPanel: React.FC = () => {
  const actionLog = useAppStore((state) => state.actionLog);
  const selectedRoundId = useAppStore((state) => state.selectedRoundId);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Filter logs for selected round (or show all)
  const filteredLogs = useMemo(() => {
    if (!selectedRoundId) return actionLog;
    return actionLog.filter((log) => !log.roundId || log.roundId === selectedRoundId);
  }, [actionLog, selectedRoundId]);

  // Group logs by status
  const { pending, success, failed, skipped } = useMemo(() => {
    const groups = {
      pending: [] as ActionLogEntry[],
      success: [] as ActionLogEntry[],
      failed: [] as ActionLogEntry[],
      skipped: [] as ActionLogEntry[],
    };

    filteredLogs.forEach((log) => {
      groups[log.status].push(log);
    });

    return groups;
  }, [filteredLogs]);

  const getStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case 'success':
        return <span className="badge badge-success">Success</span>;
      case 'failed':
        return <span className="badge badge-error">Failed</span>;
      case 'pending':
        return <span className="badge badge-info">Pending</span>;
      case 'skipped':
        return <span className="badge badge-warning">Skipped</span>;
    }
  };

  const getActionLabel = (log: ActionLogEntry): string => {
    switch (log.type) {
      case 'move_to_waiting_room':
        return 'Move to WR';
      case 'admit_from_waiting_room':
        return 'Admit from WR';
      case 'parse_csv':
        return 'Parse CSV';
      case 'start_round':
        return 'Start Round';
      case 'end_round':
        return 'End Round';
    }
  };

  return (
    <div className="card">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-xl font-bold">Activity Log</h2>
        <button className="text-gray-600 hover:text-gray-900">
          {isCollapsed ? '▼ Expand' : '▲ Collapse'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2 my-4 text-center text-sm">
            <div className="p-2 bg-green-50 rounded">
              <div className="font-bold text-green-700">{success.length}</div>
              <div className="text-green-600 text-xs">Success</div>
            </div>
            <div className="p-2 bg-red-50 rounded">
              <div className="font-bold text-red-700">{failed.length}</div>
              <div className="text-red-600 text-xs">Failed</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <div className="font-bold text-yellow-700">{skipped.length}</div>
              <div className="text-yellow-600 text-xs">Skipped</div>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-bold text-blue-700">{pending.length}</div>
              <div className="text-blue-600 text-xs">Pending</div>
            </div>
          </div>

          {/* Log Entries */}
          <div className="max-h-96 overflow-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                No activity logged yet
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.slice().reverse().map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded border text-sm ${
                      log.status === 'failed' ? 'bg-red-50 border-red-200' :
                      log.status === 'success' ? 'bg-green-50 border-green-200' :
                      log.status === 'skipped' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium">{getActionLabel(log)}</div>
                  <div className="text-xs text-gray-600">{formatTimestamp(log.timestamp)}</div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(log.status)}
                  {log.roundId && (
                    <span className="text-xs text-gray-600">Round: {log.roundId}</span>
                  )}
                </div>

                {log.displayName && (
                  <div className="text-xs text-gray-700">
                    Participant: {log.displayName}
                    {log.email && ` (${log.email})`}
                  </div>
                )}

                {log.error && (
                  <div className="text-xs text-red-700 mt-1 bg-red-100 p-1 rounded">
                    {log.error}
                  </div>
                )}

                {log.retryCount !== undefined && log.retryCount > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    Retries: {log.retryCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failed Actions - Retry Button */}
      {failed.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 rounded">
          <div className="text-sm font-medium text-red-900 mb-2">
            {failed.length} failed action{failed.length !== 1 ? 's' : ''}
          </div>
          <button
            className="btn btn-danger btn-sm w-full"
            onClick={() => {
              // This would trigger retry logic - implementing in future iteration
              alert('Retry functionality - to be implemented');
            }}
          >
            Retry Failed Actions
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
};
