import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/firebaseApi';

interface UseCollectionResult<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCollection<T>(collectionName: string): UseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCollection(collectionName);
      setData(result as T[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}