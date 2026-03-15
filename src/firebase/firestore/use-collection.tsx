
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, type Query } from 'firebase/firestore';
import { useFirebase } from '../provider';

export function useCollection<T>(path: string | null) {
  const { db } = useFirebase();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) return;
    const ref = collection(db, path);
    return onSnapshot(ref, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
      setLoading(false);
    });
  }, [db, path]);

  return { data, loading };
}
