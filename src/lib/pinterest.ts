// Pinterest API integration
// Pinterest API v5 requires OAuth 2.0 authentication with PKCE
// Note: Pinterest API search may require authentication depending on API permissions

export interface PinterestImageInfo {
  url: string;
  description?: string;
}

export interface PinterestPin {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  media: {
    images?: {
      '564x'?: { url: string };
      '736x'?: { url: string };
      'originals'?: { url: string };
    };
  };
  board_id?: string;
  board_section_id?: string | null;
  created_at?: string;
}

export interface PinterestSearchResponse {
  items: PinterestPin[];
  bookmark?: string;
}

const PINTEREST_API_URL = 'https://api.pinterest.com/v5';
const PINTEREST_OAUTH_URL = 'https://www.pinterest.com/oauth';

// Storage keys
const STORAGE_ACCESS_TOKEN = 'pinterest_access_token';
const STORAGE_CODE_VERIFIER = 'pinterest_code_verifier';

/**
 * Generate a random string for PKCE
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

/**
 * Generate code verifier and challenge for PKCE
 */
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = generateRandomString(128);
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Initiate Pinterest OAuth flow
 */
export async function initiatePinterestOAuth(): Promise<void> {
  const clientId = import.meta.env.VITE_PINTEREST_APP_ID;
  
  if (!clientId) {
    throw new Error('Pinterest App ID is not configured. Please set VITE_PINTEREST_APP_ID in your .env.local file.');
  }

  const { codeVerifier, codeChallenge } = await generatePKCE();
  
  // Store code verifier for later use
  sessionStorage.setItem(STORAGE_CODE_VERIFIER, codeVerifier);

  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const scopes = ['pins:read', 'boards:read'];
  
  const authUrl = new URL(`${PINTEREST_OAUTH_URL}/`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', scopes.join(','));
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', generateRandomString(16));

  window.location.href = authUrl.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangePinterestCode(code: string): Promise<string> {
  const clientId = import.meta.env.VITE_PINTEREST_APP_ID;
  const codeVerifier = sessionStorage.getItem(STORAGE_CODE_VERIFIER);
  
  if (!clientId) {
    throw new Error('Pinterest App ID is not configured.');
  }
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the OAuth flow.');
  }

  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  
  // Use proxy in development (via Vite), direct URL in production
  // In production, you may need to set up your own proxy or use a backend service
  const isDevelopment = import.meta.env.DEV;
  const tokenEndpoint = isDevelopment 
    ? '/api/pinterest-oauth'  // Use Vite proxy in development
    : `${PINTEREST_OAUTH_URL}/token`;  // Direct in production (may need backend proxy)
  
  let response: Response;
  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });
  } catch (fetchError) {
    // Handle network errors (CORS, network failure, etc.)
    if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
      const errorMsg = isDevelopment
        ? 'Failed to connect to Pinterest. Make sure your dev server is running and the proxy is configured correctly.'
        : 'Failed to connect to Pinterest. This is likely a CORS issue. ' +
          'For production, you need to set up a backend proxy for OAuth token exchange, ' +
          'or use a manual access token. Check the browser console for more details.';
      throw new Error(errorMsg);
    }
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Pinterest OAuth error: ${error.error_description || error.error || response.statusText}`);
  }

  const data = await response.json();
  const accessToken = data.access_token;
  
  // Store access token
  localStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken);
  sessionStorage.removeItem(STORAGE_CODE_VERIFIER);
  
  return accessToken;
}

/**
 * Get stored access token
 */
export function getPinterestAccessToken(): string | null {
  // First check if there's a manually set token in env (for testing)
  const manualToken = import.meta.env.VITE_PINTEREST_ACCESS_TOKEN;
  if (manualToken) {
    return manualToken;
  }
  // Otherwise use stored token from OAuth flow
  return localStorage.getItem(STORAGE_ACCESS_TOKEN);
}

/**
 * Manually set an access token (for testing purposes)
 */
export function setPinterestAccessToken(token: string): void {
  localStorage.setItem(STORAGE_ACCESS_TOKEN, token);
}

/**
 * Check if user is authenticated
 */
export function isPinterestAuthenticated(): boolean {
  return !!getPinterestAccessToken();
}

/**
 * Logout from Pinterest
 */
export function logoutPinterest(): void {
  localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  sessionStorage.removeItem(STORAGE_CODE_VERIFIER);
}

/**
 * Search Pinterest pins using Pinterest API v5
 * This function searches pins from the authenticated user's account.
 * Requires OAuth authentication with 'pins:read' scope.
 * 
 * Note: Pinterest API v5 only supports searching the authenticated user's own pins,
 * not public pins. Users must connect their Pinterest account first.
 */
export async function searchPinterestPins(
  query: string,
  bookmark?: string
): Promise<PinterestSearchResponse> {
  const accessToken = getPinterestAccessToken();
  
  if (!accessToken) {
    throw new Error('Not authenticated with Pinterest. Please connect your account first to search pins.');
  }

  // Use Pinterest API v5 search endpoint via proxy to avoid CORS issues
  const isDevelopment = import.meta.env.DEV;
  const apiEndpoint = isDevelopment 
    ? '/api/pinterest-api/search/pins'  // Use Vite proxy in development
    : '/api/pinterest-api/search/pins';  // In production, you'll need a backend proxy
  
  const url = new URL(apiEndpoint, window.location.origin);
  url.searchParams.set('query', query);
  url.searchParams.set('page_size', '25'); // Default page size
  
  if (bookmark) {
    url.searchParams.set('bookmark', bookmark);
  }

  // Debug logging
  const isManualToken = !!import.meta.env.VITE_PINTEREST_ACCESS_TOKEN;
  console.log('[Pinterest API] Using token:', isManualToken ? 'Manual (from env)' : 'OAuth (from localStorage)');
  console.log('[Pinterest API] Request URL:', url.toString());

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (fetchError) {
    console.error('[Pinterest API] Fetch error:', fetchError);
    throw new Error(`Failed to connect to Pinterest API. ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
  }
  
  console.log('[Pinterest API] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = errorData.message || errorData.error_description || errorData.error || response.statusText;
    const errorCode = errorData.code;
    
    // Handle specific Pinterest API error codes
    if (errorCode === 3) {
      throw new Error('Pinterest API Error: Your application consumer type is not supported. Production Limited apps may have restricted access. Consider using a Sandbox app for testing, or contact Pinterest support to enable API access for your Production Limited app.');
    }
    
    if (response.status === 401) {
      // Only logout if not using a manual token from env
      const manualToken = import.meta.env.VITE_PINTEREST_ACCESS_TOKEN;
      if (!manualToken) {
        logoutPinterest();
      }
      throw new Error(`Pinterest authentication failed (401): ${errorMessage}. Please check your access token.`);
    }
    if (response.status === 403) {
      throw new Error(`Access denied (403): ${errorMessage}. Make sure your app has the "pins:read" scope enabled and your app type supports this endpoint.`);
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    throw new Error(`Pinterest API error (${response.status}): ${errorMessage}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error('Failed to parse Pinterest API response:', parseError);
    throw new Error('Invalid response from Pinterest API. Please try again.');
  }
  
  // Pinterest API v5 returns items in a specific format
  // Handle both direct items array and nested response structures
  const items = data.items || data.data?.items || data.data || [];
  
  if (!Array.isArray(items)) {
    console.error('Pinterest API response format unexpected:', data);
    throw new Error('Unexpected response format from Pinterest API.');
  }
  
  const pins: PinterestPin[] = items.map((item: any) => {
    const images = item?.media?.images || {};
    
    return {
      id: item?.id || `pin-${Math.random().toString(36).substr(2, 9)}`,
      title: item?.title || item?.description || query,
      description: item?.description || item?.note || '',
      link: item?.link || item?.url || '',
      media: {
        images: {
          '564x': images['564x'] ? { url: images['564x'].url } : undefined,
          '736x': images['736x'] ? { url: images['736x'].url } : undefined,
          originals: images.originals ? { url: images.originals.url } : undefined,
        },
      },
      board_id: item?.board_id,
      board_section_id: item?.board_section_id || null,
      created_at: item?.created_at,
    };
  }).filter((pin: PinterestPin) => pin.media?.images && (
    pin.media.images['564x']?.url || 
    pin.media.images['736x']?.url || 
    pin.media.images.originals?.url
  ));

  if (pins.length === 0) {
    throw new Error('No pins found matching your search. Try a different search term or make sure you have pins saved to your account.');
  }

  return {
    items: pins,
    bookmark: data.bookmark || data.next_bookmark,
  };
}

/**
 * Get user's boards
 */
export async function getPinterestBoards(bookmark?: string): Promise<{ items: Array<{ id: string; name: string }>; bookmark?: string }> {
  const accessToken = getPinterestAccessToken();
  
  if (!accessToken) {
    throw new Error('Not authenticated with Pinterest. Please connect your account first.');
  }

  const url = new URL(`${PINTEREST_API_URL}/boards`);
  if (bookmark) {
    url.searchParams.set('bookmark', bookmark);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = errorData.message || errorData.error_description || errorData.error || response.statusText;
    
    if (response.status === 401) {
      // Only logout if not using a manual token from env
      const manualToken = import.meta.env.VITE_PINTEREST_ACCESS_TOKEN;
      if (!manualToken) {
        logoutPinterest();
      }
      throw new Error(`Pinterest authentication failed (401): ${errorMessage}. Please check your access token.`);
    }
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Pinterest API error (${response.status}): ${errorMessage}`);
  }

  return response.json();
}

/**
 * Extract direct image URL from Pinterest pin URL or return the URL if it's already a direct image URL
 */
export function extractPinterestImageUrl(pinterestUrl: string): string | null {
  try {
    // If it's already a direct Pinterest image URL (i.pinimg.com), return it
    if (pinterestUrl.includes('i.pinimg.com')) {
      // Ensure it's a direct image URL (has image extension)
      if (pinterestUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return pinterestUrl;
      }
      // If it's a pinimg.com URL without extension, still return it (might work)
      return pinterestUrl;
    }

    // If it's a Pinterest pin page URL (pinterest.com/pin/...), we cannot extract it
    // due to CORS restrictions - user needs to use "Copy image address"
    if (pinterestUrl.includes('pinterest.com/pin/')) {
      return null; // Indicates we need user action
    }

    // If it's a general pinterest.com URL, return null
    if (pinterestUrl.includes('pinterest.com')) {
      return null;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate if a URL is a Pinterest URL (pin page or image)
 */
export function isPinterestUrl(url: string): boolean {
  return url.includes('pinimg.com') || url.includes('pinterest.com');
}

/**
 * Check if a URL is a direct Pinterest image URL
 */
export function isPinterestImageUrl(url: string): boolean {
  return url.includes('i.pinimg.com') && url.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;
}

/**
 * Convert a Pinterest image URL to use the proxy to avoid CORS issues
 * Returns the proxied URL in development, or the original URL in production
 */
export function getProxiedPinterestImageUrl(url: string): string {
  if (!isPinterestImageUrl(url)) {
    return url;
  }
  
  // In development, use the Vite proxy
  if (import.meta.env.DEV) {
    // Extract the path from the Pinterest URL
    try {
      const urlObj = new URL(url);
      // Remove the protocol and domain, keep the path
      const path = urlObj.pathname + urlObj.search;
      return `/api/pinterest-image${path}`;
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }
  
  // In production, you would need a backend proxy
  // For now, return the original URL
  return url;
}

/**
 * Get instructions for extracting Pinterest image URLs
 */
export function getPinterestInstructions(): string {
  return 'To use Pinterest images: Right-click on a Pinterest image → "Copy image address" → Paste the URL here. Direct pin URLs are not supported due to CORS restrictions.';
}

