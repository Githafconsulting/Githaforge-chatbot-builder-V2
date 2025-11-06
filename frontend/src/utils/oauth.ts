/**
 * OAuth popup handler utility
 * Handles OAuth authorization flow in popup window
 */

interface OAuthPopupOptions {
  url: string;
  title: string;
  width?: number;
  height?: number;
}

interface OAuthResult {
  success: boolean;
  platform?: string;
  error?: string;
}

/**
 * Open OAuth authorization URL in popup window
 *
 * @param options - Popup configuration
 * @returns Promise resolving with OAuth result
 */
export function openOAuthPopup(options: OAuthPopupOptions): Promise<OAuthResult> {
  const {
    url,
    title = 'OAuth Authorization',
    width = 600,
    height = 700,
  } = options;

  return new Promise((resolve, reject) => {
    // Calculate center position
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // Open popup window
    const popup = window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      // Popup blocked
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // For redirect-based OAuth (which is what we're using), the popup
    // will redirect back to our app with ?success= or ?error= parameters.
    // The Integrations page useEffect will handle the callback.
    // We just need to detect when the popup closes or completes.

    // Set up message listener for OAuth callback
    const messageListener = (event: MessageEvent) => {
      // Validate origin (important for security)
      const allowedOrigins = [
        window.location.origin,
        import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn('Received message from unauthorized origin:', event.origin);
        return;
      }

      // Check if this is our OAuth callback message
      if (event.data && event.data.type === 'oauth_callback') {
        console.log('[OAuth] Received callback message:', event.data);

        // Clean up
        window.removeEventListener('message', messageListener);
        clearInterval(storageCheckInterval);
        clearTimeout(timeoutId);
        localStorage.removeItem(oauthKey);

        // No need to close popup - it closes itself via window.close() in OAuthCallback.tsx
        // Attempting to close it here triggers COOP warnings

        // Resolve promise
        if (event.data.success) {
          resolve({
            success: true,
            platform: event.data.platform
          });
        } else {
          resolve({
            success: false,
            error: event.data.error || 'Authorization failed'
          });
        }
      }
    };

    window.addEventListener('message', messageListener);

    // Use storage events instead of popup.closed to avoid COOP warnings
    // The backend redirects to the main page with URL params, which triggers
    // the useEffect in Integrations.tsx. We can detect completion via localStorage.
    const oauthKey = `oauth_in_progress_${Date.now()}`;
    localStorage.setItem(oauthKey, 'true');

    const storageCheckInterval = setInterval(() => {
      // Check if OAuth completed by seeing if localStorage was cleared
      // (This is a fallback - the main flow uses URL params)
      const oauthInProgress = localStorage.getItem(oauthKey);

      if (!oauthInProgress) {
        console.log('[OAuth] localStorage flag cleared - resolving');
        clearInterval(storageCheckInterval);
        window.removeEventListener('message', messageListener);
        clearTimeout(timeoutId);

        resolve({
          success: true,
          platform: 'unknown'
        });
      }
    }, 1000);

    // Timeout after 5 minutes
    const timeoutId = setTimeout(() => {
      console.log('[OAuth] Timeout - resolving with error');
      clearInterval(storageCheckInterval);
      window.removeEventListener('message', messageListener);

      // Try to close popup (ignore COOP errors)
      try {
        if (popup && !popup.closed) {
          popup.close();
        }
      } catch (e) {
        // Ignore cross-origin errors
      }

      localStorage.removeItem(oauthKey);

      resolve({
        success: false,
        error: 'Authorization timeout'
      });
    }, 5 * 60 * 1000); // 5 minutes
  });
}

/**
 * Parse OAuth callback URL parameters
 * Used in the callback page to extract success/error status
 *
 * @returns OAuth callback data
 */
export function parseOAuthCallback(): OAuthResult {
  const params = new URLSearchParams(window.location.search);

  const success = params.get('success');
  const error = params.get('error');
  const platform = params.get('platform') || success || undefined;

  if (error) {
    return {
      success: false,
      error: error
    };
  }

  if (success) {
    return {
      success: true,
      platform: success
    };
  }

  return {
    success: false,
    error: 'Invalid callback URL'
  };
}

/**
 * Send OAuth callback result to parent window
 * Used in the callback page to notify the main app
 *
 * @param result - OAuth result
 */
export function notifyOAuthParent(result: OAuthResult): void {
  console.log('[OAuth] notifyOAuthParent called with:', result);
  console.log('[OAuth] window.opener:', window.opener ? 'present' : 'null');

  if (window.opener) {
    // Send message to parent window
    console.log('[OAuth] Sending postMessage to parent');
    window.opener.postMessage(
      {
        type: 'oauth_callback',
        ...result
      },
      window.location.origin
    );

    // Close popup after short delay
    setTimeout(() => {
      console.log('[OAuth] Closing popup');
      window.close();
    }, 500);
  } else {
    // No parent window, redirect to main app
    console.log('[OAuth] No parent window, redirecting to /admin/integrations');
    window.location.href = '/admin/integrations';
  }
}

/**
 * Handle Google Drive OAuth flow
 *
 * @param authorizationUrl - Google OAuth authorization URL
 * @returns Promise resolving with OAuth result
 */
export async function connectGoogleDrive(authorizationUrl: string): Promise<OAuthResult> {
  return openOAuthPopup({
    url: authorizationUrl,
    title: 'Connect Google Drive',
    width: 600,
    height: 700
  });
}

/**
 * Handle Microsoft OAuth flow
 * (Placeholder for Phase 2)
 */
export async function connectMicrosoft(authorizationUrl: string): Promise<OAuthResult> {
  return openOAuthPopup({
    url: authorizationUrl,
    title: 'Connect Microsoft 365',
    width: 600,
    height: 700
  });
}

/**
 * Handle Dropbox OAuth flow
 * (Placeholder for Phase 3)
 */
export async function connectDropbox(authorizationUrl: string): Promise<OAuthResult> {
  return openOAuthPopup({
    url: authorizationUrl,
    title: 'Connect Dropbox',
    width: 600,
    height: 700
  });
}

/**
 * Handle Confluence OAuth flow
 * (Placeholder for Phase 4)
 */
export async function connectConfluence(authorizationUrl: string): Promise<OAuthResult> {
  return openOAuthPopup({
    url: authorizationUrl,
    title: 'Connect Confluence',
    width: 600,
    height: 700
  });
}
