/**
 * Utility to resolve backend API endpoints across Web, PWA, and Native Capacitor APK.
 * In the native Android APK (Capacitor), requests to relative paths like '/api/*'
 * would hit the internal webview host (http://localhost/ or capacitor://localhost/),
 * which serves the SPA index.html instead of the backend Express server.
 * This helper automatically targets the cloud backend URL in native APK environments.
 */

const CLOUD_BACKEND_URL = 'https://ais-pre-jfmgneqwgnrvfjcbqw6izd-553675162080.us-east1.run.app';

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If already absolute URL, return directly
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  if (typeof window === 'undefined') {
    return cleanPath;
  }

  // Detect if running inside Capacitor Android APK
  const isCapacitorNative =
    window.location.protocol === 'capacitor:' ||
    typeof (window as any).Capacitor !== 'undefined' ||
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      (!window.location.port || window.location.port === '80' || window.location.port === ''));

  if (isCapacitorNative) {
    return `${CLOUD_BACKEND_URL}${cleanPath}`;
  }

  return cleanPath;
}
