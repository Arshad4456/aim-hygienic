import { useCallback, useState } from 'react';

export function usePaginatedFetch(fetcher) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = false) => {
    if (loading || (!hasMore && !reset)) {
      return;
    }
    setLoading(true);
    const nextPage = reset ? 1 : page;

    try {
      const response = await fetcher(nextPage);
      const nextItems = response?.items || [];
      setItems((prev) => (reset ? nextItems : [...prev, ...nextItems]));
      setHasMore(Boolean(response?.hasMore));
      setPage(nextPage + 1);
    } finally {
      setLoading(false);
    }
  }, [fetcher, hasMore, loading, page]);

  return { items, loading, hasMore, load };
}
