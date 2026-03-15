
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, type DocumentReference } from 'firebase/firestore';
import { useFirebase } from '../provider';

export function useDoc<T>(path: string | null) {
  const { db } = useFirebase();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) return;
    const ref = doc(db, path);
    return onSnapshot(ref, (snap) => {
      setData(snap.exists() ? (snap.data() as T) : null);
      setLoading(false);
    });
  }, [db, path]);

  return { data, loading };
}
