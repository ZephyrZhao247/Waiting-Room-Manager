import React, { useRef, useState } from 'react';
import { parseCSV } from '../csv/parse';
import { useAppStore } from '../state/store';
import type { CSVParseResult } from '../types';

export const UploadPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setParsedRounds = useAppStore((state) => state.setParsedRounds);
  const setEmailToName = useAppStore((state) => state.setEmailToName);
  const addActionLog = useAppStore((state) => state.addActionLog);
  const parsedRounds = useAppStore((state) => state.parsedRounds);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setParseResult(null);

    try {
      const content = await file.text();
      const result = await parseCSV(content);

      setParseResult(result);

      if (result.success && result.data) {
        setParsedRounds(result.data.rounds);
        setEmailToName(result.data.emailToName);
        
        addActionLog({
          type: 'parse_csv',
          status: 'success',
        });
      } else {
        addActionLog({
          type: 'parse_csv',
          status: 'failed',
          error: result.errors.join('; '),
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setParseResult({
        success: false,
        errors: [errorMsg],
        warnings: [],
        stats: { totalRows: 0, roundsFound: 0, uniqueEmails: 0 },
      });

      addActionLog({
        type: 'parse_csv',
        status: 'failed',
        error: errorMsg,
      });
    } finally {
      setIsLoading(false);
      // Reset file input to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">CSV Data</h2>

      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={handleUploadClick}
          disabled={isLoading}
          className="btn btn-primary w-full"
        >
          {isLoading ? 'Parsing...' : 'Upload CSV'}
        </button>
      </div>

      {parseResult && (
        <div className="flex-1 overflow-auto">
          {/* Stats */}
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Parse Summary</h3>
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className={parseResult.success ? 'text-green-600' : 'text-red-600'}>
                  {parseResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
              <div>
                <span className="font-medium">Total Rows:</span> {parseResult.stats.totalRows}
              </div>
              <div>
                <span className="font-medium">Rounds Found:</span> {parseResult.stats.roundsFound}
              </div>
              <div>
                <span className="font-medium">Unique Emails:</span> {parseResult.stats.uniqueEmails}
              </div>
              {parseResult.data && (
                <div>
                  <span className="font-medium">Format:</span>{' '}
                  <span className="badge badge-info">{parseResult.data.format}</span>
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {parseResult.errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 rounded">
              <h3 className="font-semibold text-red-800 mb-2">Errors</h3>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                {parseResult.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">Warnings</h3>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside max-h-32 overflow-auto">
                {parseResult.warnings.slice(0, 10).map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
                {parseResult.warnings.length > 10 && (
                  <li className="font-medium">... and {parseResult.warnings.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Round Preview */}
          {parseResult.success && parseResult.data && (
            <div className="p-3 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">Rounds Preview</h3>
              <div className="text-sm space-y-2 max-h-64 overflow-auto">
                {Array.from(parseResult.data.rounds.entries()).map(([roundId, emails]) => (
                  <div key={roundId} className="pb-2 border-b border-blue-200 last:border-0">
                    <div className="font-medium text-blue-900">{roundId}</div>
                    <div className="text-blue-700">
                      {emails.size} conflict{emails.size !== 1 ? 's' : ''}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-blue-600 hover:underline">
                        Show emails
                      </summary>
                      <ul className="mt-1 pl-4 text-xs max-h-24 overflow-auto">
                        {Array.from(emails).map((email) => (
                          <li key={email}>{email}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!parseResult && parsedRounds.size > 0 && (
        <div className="flex-1">
          <div className="p-3 bg-green-50 rounded">
            <h3 className="font-semibold text-green-800 mb-2">Current Data</h3>
            <div className="text-sm text-green-700">
              {parsedRounds.size} round{parsedRounds.size !== 1 ? 's' : ''} loaded
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
