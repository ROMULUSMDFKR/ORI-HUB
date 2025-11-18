import { useState, useEffect } from 'react';
import { api } from '../api/firebaseApi';

interface UseDocResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useDoc<T>(collectionName: string, docId: string): UseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
        setLoading(false);
        setData(null);
        return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getDoc(collectionName, docId);
        if (result) {
            setData(result as T);
        } else {
            setError(new Error("Document not found"));
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionName, docId]);

  return { data, loading, error };
}
