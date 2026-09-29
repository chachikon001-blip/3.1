// Central API endpoint resolver for Multi-Host and Vercel Cross-Origin Sync

export const LIVE_SERVER_URL = 'https://ais-pre-heofed3txxbewfloufcgry-492661566686.asia-southeast1.run.app';

/**
 * Resolves the full URL for any API endpoint.
 * If running on Vercel, Netlify, or another external static domain,
 * automatically routes requests to the live Cloud Run backend server.
 */
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    
    // Check if custom backend URL was set by user
    const customBackend = localStorage.getItem('boss_timer_custom_backend');
    if (customBackend) {
      return `${customBackend.replace(/\/$/, '')}${cleanEndpoint}`;
    }

    // When running on Vercel, Netlify, or Github Pages where Express is not running
    if (
      host.includes('vercel.app') ||
      host.includes('github.io') ||
      host.includes('netlify.app')
    ) {
      return `${LIVE_SERVER_URL}${cleanEndpoint}`;
    }
  }

  return cleanEndpoint;
};

/**
 * Returns the recommended share link to send to guild members so everyone connects to the exact same live server
 */
export const getLiveShareUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('run.app')) {
      return window.location.origin;
    }
  }
  return LIVE_SERVER_URL;
};
