// Server configuration for association storage
// You can modify this URL to point to your backend server

// Default server URL - change this to your backend server (without trailing slash)
export const DEFAULT_SERVER_URL = 'https://gunnar-personifiable-chromatographically.ngrok-free.dev';

// Get server URL from localStorage or use default
export function getServerUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL;
  return localStorage.getItem('associationServerUrl') || DEFAULT_SERVER_URL;
}

// Set server URL in localStorage
export function setServerUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('associationServerUrl', url);
}
