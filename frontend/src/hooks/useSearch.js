import { useState, useEffect } from 'react';
import { searchService } from '../services/searchService';

export function useSearch(debounceMs = 400) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [], hashtags: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], posts: [], hashtags: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchService.globalSearch(query.trim());
        setResults(data);
      } catch (e) {
        console.warn('Search error:', e.message);
        setResults({ users: [], posts: [], hashtags: [] });
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return { query, setQuery, results, loading, filter, setFilter };
}
