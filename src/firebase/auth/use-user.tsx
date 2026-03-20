
'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useFirebase } from '../provider';

export function useUser() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const mod = await import('firebase/auth');
      unsub = mod.onAuthStateChanged(auth, (u: User | null) => {
        setUser(u);
        setLoading(false);
      });
    })();

    return () => {
      if (unsub) try { unsub(); } catch { }
    };
  }, [auth]);

  return { user, loading };
}
