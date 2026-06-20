import { useState, useCallback, useRef, useEffect } from 'react';
import { searchApi } from '../api/search';
import type { SearchResult, SearchResponse, RAGResponse } from '../types';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [tookMs, setTookMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ragAnswer, setRagAnswer] = useState<RAGResponse | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(
    async (
      searchQuery: string,
      options: {
        searchType?: 'semantic' | 'hybrid' | 'keyword';
        fileTypes?: string[];
        dateFrom?: string;
        dateTo?: string;
        projectId?: string;
        page?: number;
        size?: number;
      } = {}
    ) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response: SearchResponse = await searchApi.search({
          query: searchQuery,
          search_type: options.searchType || 'hybrid',
          file_types: options.fileTypes,
          date_from: options.dateFrom,
          date_to: options.dateTo,
          project_id: options.projectId,
          page: options.page || 1,
          size: options.size || 20,
        });
        setResults(response.results);
        setTotal(response.total);
        setTookMs(response.took_ms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const sug = await searchApi.getSuggestions(q);
      setSuggestions(sug);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const debouncedSuggestions = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
    },
    [fetchSuggestions]
  );

  const askQuestion = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setRagLoading(true);
    setRagAnswer(null);
    try {
      const answer = await searchApi.askQuestion(q);
      setRagAnswer(answer);
    } catch {
      setRagAnswer(null);
    } finally {
      setRagLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotal(0);
    setTookMs(0);
    setError(null);
    setQuery('');
    setSuggestions([]);
    setRagAnswer(null);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    total,
    tookMs,
    loading,
    error,
    suggestions,
    ragAnswer,
    ragLoading,
    search,
    askQuestion,
    clearResults,
    debouncedSuggestions,
  };
}
