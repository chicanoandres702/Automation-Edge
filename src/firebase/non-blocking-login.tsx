'use client';
import type { Auth } from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // Dynamically import the auth method to avoid pulling firebase/auth into
  // server bundles during build.
  void import('firebase/auth').then((m) => m.signInAnonymously(authInstance)).catch(() => {});
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  void import('firebase/auth')
    .then((m) => m.createUserWithEmailAndPassword(authInstance, email, password))
    .catch(() => {});
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  void import('firebase/auth')
    .then((m) => m.signInWithEmailAndPassword(authInstance, email, password))
    .catch(() => {});
}

/** Initiate Google sign-in (non-blocking). Uses popup with redirect fallback. */
export function initiateGoogleSignIn(authInstance: Auth): void {
  // If we're running inside a Chrome extension and the Identity API is available,
  // use it to obtain an OAuth access token and sign into Firebase with the
  // credential. This avoids loading gapi (https://apis.google.com/js/api.js)
  // which is blocked by the extension Content Security Policy.
  const win = typeof window !== 'undefined' ? (window as any) : undefined;

  const doWebPopup = async () => {
    try {
      const m = await import('firebase/auth');
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = m as any;
      const provider = new GoogleAuthProvider();
      try { await signInWithPopup(authInstance, provider); }
      catch (e) { try { await signInWithRedirect(authInstance, provider); } catch (_) { } }
    } catch (_) { /* ignore */ }
  };

  try {
    // Prefer the launchWebAuthFlow path when available and a valid OAuth client
    // is configured in the manifest. This flow opens a window reliably from
    // extensions and avoids popup-blockers that sometimes prevent
    // signInWithPopup from opening when dynamic imports are involved.
    const manifestClientId = win?.chrome?.runtime?.getManifest?.()?.oauth2?.client_id;
    const hasValidClientId = typeof manifestClientId === 'string' && manifestClientId && !manifestClientId.includes('YOUR_GOOGLE_CLIENT_ID');

    if (win?.chrome?.identity && typeof win.chrome.identity.launchWebAuthFlow === 'function' && hasValidClientId) {
      try {
        const redirectUri = win.chrome.identity.getRedirectURL();
        // Use token (implicit) flow so we can directly obtain an access_token
        // and pass it into Firebase's signInWithCredential. The redirect URI
        // must be registered for your OAuth client in Google Cloud Console.
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(manifestClientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('openid email profile')}&prompt=consent`;

        win.chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectResponse) => {
          const lastErr = win.chrome.runtime && win.chrome.runtime.lastError;
          if (lastErr || !redirectResponse) {
            // Fallback to the legacy getAuthToken path or web popup
            try {
              if (typeof win.chrome.identity.getAuthToken === 'function') {
                win.chrome.identity.getAuthToken({ interactive: true }, (token: string | undefined) => {
                  const innerErr = win.chrome.runtime && win.chrome.runtime.lastError;
                  if (innerErr || !token) { void doWebPopup(); return; }
                  void import('firebase/auth').then(async (m) => {
                    try {
                      const { GoogleAuthProvider, signInWithCredential } = m as any;
                      const cred = GoogleAuthProvider.credential(null, token);
                      await signInWithCredential(authInstance, cred);
                    } catch (e) { await doWebPopup(); }
                  }).catch(async () => { await doWebPopup(); });
                });
                return;
              }
            } catch (e) { /* ignore */ }
            void doWebPopup();
            return;
          }

          try {
            // Parse access_token from fragment (#access_token=...)
            const url = new URL(redirectResponse);
            const hash = url.hash || '';
            const params = new URLSearchParams(hash.replace(/^#/, ''));
            const token = params.get('access_token');
            if (!token) { void doWebPopup(); return; }

            void import('firebase/auth').then(async (m) => {
              try {
                const { GoogleAuthProvider, signInWithCredential } = m as any;
                const cred = GoogleAuthProvider.credential(null, token);
                await signInWithCredential(authInstance, cred);
              } catch (e) { await doWebPopup(); }
            }).catch(async () => { await doWebPopup(); });

          } catch (e) {
            void doWebPopup();
          }
        });
        return;
      } catch (e) {
        // fall through to fallback flows
      }
    }

    if (win?.chrome?.identity && typeof win.chrome.identity.getAuthToken === 'function') {
      try {
        // interactive: true will prompt the user for consent if needed.
        win.chrome.identity.getAuthToken({ interactive: true }, (token: string | undefined) => {
          const lastErr = win.chrome.runtime && win.chrome.runtime.lastError;
          if (lastErr || !token) {
            // Fallback to web popup/redirect if the identity flow failed.
            void doWebPopup();
            return;
          }

          void import('firebase/auth').then(async (m) => {
            try {
              const { GoogleAuthProvider, signInWithCredential } = m as any;
              const cred = GoogleAuthProvider.credential(null, token);
              await signInWithCredential(authInstance, cred);
            } catch (e) {
              // If credential sign-in fails, fallback to web popup.
              await doWebPopup();
            }
          }).catch(async () => { await doWebPopup(); });
        });
        return;
      } catch (e) {
        // fall through to web popup
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  // Default web flow (popup -> redirect) when not running as an extension.
  void doWebPopup();
}
