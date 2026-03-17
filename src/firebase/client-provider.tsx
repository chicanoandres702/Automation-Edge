'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { firebaseConfig } from './config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [sdks, setSdks] = useState<null | { firebaseApp: any; auth: any; firestore: any }>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Dynamically import the Firebase SDKs on the client only. This avoids
      // pulling the SDK into server-side bundles where it can cause warnings
      // or unexpected initialization attempts.
      const firebaseAppModule = await import('firebase/app');
      const authModule = await import('firebase/auth');
      const firestoreModule = await import('firebase/firestore');

      const { initializeApp, getApps, getApp } = firebaseAppModule;
      const { getAuth } = authModule;
      const { getFirestore } = firestoreModule;

      let app: any;
      try {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      } catch (err) {
        // In case of any errors, fall back to explicit initialization.
        app = initializeApp(firebaseConfig);
      }

      const auth = getAuth(app);
      const firestore = getFirestore(app);

      if (mounted) setSdks({ firebaseApp: app, auth, firestore });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Do not render children on the server or before the client-side SDKs are
  // initialized. Rendering children while not wrapped by the FirebaseProvider
  // can cause hooks like `useFirebase` to throw during prerender.
  if (!sdks) return null;

  return (
    <FirebaseProvider firebaseApp={sdks.firebaseApp} auth={sdks.auth} firestore={sdks.firestore}>
      {children}
    </FirebaseProvider>
  );
}