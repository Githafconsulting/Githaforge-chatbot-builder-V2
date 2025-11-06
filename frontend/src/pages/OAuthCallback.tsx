import { useEffect } from 'react';
import { parseOAuthCallback, notifyOAuthParent } from '../utils/oauth';

/**
 * OAuth Callback Landing Page
 *
 * This page is opened in the popup window after OAuth completes.
 * It extracts the success/error from URL params, notifies the parent window,
 * and closes the popup.
 */
export const OAuthCallback: React.FC = () => {
  useEffect(() => {
    console.log('[OAuthCallback] Page loaded');
    console.log('[OAuthCallback] URL:', window.location.href);

    // Parse OAuth result from URL
    const result = parseOAuthCallback();
    console.log('[OAuthCallback] Parsed result:', result);

    // Notify parent window and close popup
    notifyOAuthParent(result);
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1e293b',
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #3b82f6',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ fontSize: '14px', opacity: 0.8 }}>Completing authorization...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
