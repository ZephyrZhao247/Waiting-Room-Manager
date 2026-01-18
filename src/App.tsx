import React, { useEffect, useState } from 'react';
import { configureZoomSDK, isInZoomClient, getMeetingContext } from './sdk/zoom';
import { UploadPanel } from './components/UploadPanel';
import { RoundSelector } from './components/RoundSelector';
import { ControlPanel } from './components/ControlPanel';
import { LogPanel } from './components/LogPanel';
import { ManualControlPanel } from './components/ManualControlPanel';
import { EmailAssociationPanel } from './components/EmailAssociationPanel';
import { AssociationManager } from './components/AssociationManager';

function App() {
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);

  useEffect(() => {
    const initializeSDK = async () => {
      console.log('[App] Starting SDK initialization...');
      
      // Configure SDK
      const configResult = await configureZoomSDK();
      if (!configResult.success) {
        console.error('[App] SDK config failed:', configResult.error);
        setSdkStatus('error');
        setErrorMessage(
          configResult.error || 'Failed to configure Zoom SDK. Make sure you are running this app from within a Zoom meeting.'
        );
        return;
      }

      console.log('[App] SDK configured successfully');

      // Check if user is host
      const contextResult = await getMeetingContext();
      if (!contextResult.success) {
        console.error('[App] Failed to get meeting context:', contextResult.error);
        setSdkStatus('error');
        setErrorMessage(
          contextResult.error || 'Failed to get meeting context. Make sure you are in an active meeting.'
        );
        return;
      }

      console.log('[App] Meeting context:', contextResult);

      if (!contextResult.isHost) {
        console.warn('[App] User is not host/co-host');
        setSdkStatus('error');
        setErrorMessage(
          'This app must be run by the meeting host or co-host to manage waiting room participants.'
        );
        return;
      }

      console.log('[App] Initialization complete - user is host');
      setIsHost(true);
      setSdkStatus('ready');
    };

    initializeSDK();
  }, []);

  if (sdkStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700">Initializing Zoom App...</div>
        </div>
      </div>
    );
  }

  if (sdkStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Start</h1>
          <p className="text-gray-700 mb-4">{errorMessage}</p>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <strong>How to use this app:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Start or join a Zoom meeting as host/co-host</li>
              <li>Click "Apps" in the meeting toolbar</li>
              <li>Find and open "Waiting Room Manager"</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header with Association Manager */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zoom Waiting Room Manager</h1>
          <p className="text-sm text-gray-600">
            Automate per-round participant exclusions based on CSV conflict lists
          </p>
        </div>
        <AssociationManager />
      </div>

      {/* Round Selector */}
      <div className="mb-4">
        <RoundSelector />
      </div>

      {/* Main Layout: Top row - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Upload Panel */}
        <div className="lg:col-span-1">
          <UploadPanel />
        </div>

        {/* Control Panel */}
        <div className="lg:col-span-1">
          <ControlPanel />
        </div>

        {/* Email Association Panel */}
        <div className="lg:col-span-1">
          <EmailAssociationPanel />
        </div>
      </div>

      {/* Manual Control Panel - Full Width */}
      <div className="mb-4">
        <ManualControlPanel />
      </div>

      {/* Activity Log - Collapsible at Bottom */}
      <div>
        <LogPanel />
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>Session persisted in localStorage • Refresh-safe</p>
      </div>
    </div>
  );
}

export default App;

