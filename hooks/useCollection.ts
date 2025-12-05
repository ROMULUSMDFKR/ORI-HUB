import { useState, useEffect } from 'react';
import { api } from '../api/firebaseApi';

interface UseCollectionResult<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export function useCollection<T>(collectionName: string): UseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
    };

    fetchData();
  }, [collectionName]);

  return { data, loading, error };
}
