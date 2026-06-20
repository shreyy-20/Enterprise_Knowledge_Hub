import React, { useEffect } from 'react';
import { Box, Typography, Alert, Paper, alpha, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import { useSearch } from '../hooks/useSearch';

const SearchPage: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { results, tookMs, loading, error, search, clearResults } = useSearch();

  // Extract query parameters from URL
  const queryParam = searchParams.get('q') || '';
  const searchTypeParam = (searchParams.get('type') as 'semantic' | 'hybrid' | 'keyword') || 'hybrid';
  const projectIdParam = searchParams.get('projectId') || '';
  const departmentIdParam = searchParams.get('deptId') || '';
  const dateRangeParam = searchParams.get('dateRange') || 'all';
  const fileTypesParam = searchParams.get('fileTypes') ? searchParams.get('fileTypes')!.split(',') : [];

  // Run search when URL query parameters change
  useEffect(() => {
    if (queryParam.trim()) {
      // Calculate date filters based on dateRange (e.g. 7d, 30d, 90d)
      let dateFrom: string | undefined;
      const now = new Date();
      if (dateRangeParam === '7d') {
        dateFrom = new Date(now.setDate(now.getDate() - 7)).toISOString();
      } else if (dateRangeParam === '30d') {
        dateFrom = new Date(now.setDate(now.getDate() - 30)).toISOString();
      } else if (dateRangeParam === '90d') {
        dateFrom = new Date(now.setDate(now.getDate() - 90)).toISOString();
      }

      search(queryParam, {
        searchType: searchTypeParam,
        projectId: projectIdParam || undefined,
        fileTypes: fileTypesParam.length > 0 ? fileTypesParam : undefined,
        dateFrom: dateFrom,
      });
    } else {
      clearResults();
    }
  }, [queryParam, searchTypeParam, projectIdParam, departmentIdParam, dateRangeParam, searchParams, search, clearResults]);

  const handleSearchTrigger = (
    newQuery: string,
    options: {
      searchType: 'semantic' | 'hybrid' | 'keyword';
      fileTypes: string[];
      dateRange: string;
      projectId: string;
      departmentId: string;
    }
  ) => {
    const params: Record<string, string> = { q: newQuery };
    if (options.searchType !== 'hybrid') params.type = options.searchType;
    if (options.projectId) params.projectId = options.projectId;
    if (options.departmentId) params.deptId = options.departmentId;
    if (options.dateRange !== 'all') params.dateRange = options.dateRange;
    if (options.fileTypes.length > 0) params.fileTypes = options.fileTypes.join(',');

    setSearchParams(params);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: { xs: 1, sm: 3 } }}>
      {/* Title Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.025em' }}>
          Knowledge Search
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Query the enterprise knowledge base using semantic matching, keywords, or hybrid search.
        </Typography>
      </Box>

      {/* Advanced Search Bar */}
      <SearchBar
        onSearch={handleSearchTrigger}
        initialQuery={queryParam}
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Section */}
      {queryParam.trim() ? (
        <SearchResults
          results={results}
          query={queryParam}
          loading={loading}
          tookMs={tookMs}
        />
      ) : (
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 6,
            textAlign: 'center',
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: 4,
            bgcolor: 'transparent',
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
            Awaiting Query
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto' }}>
            Enter terms in the search input above to inspect records, or toggle &quot;Ask AI&quot; to synthesize natural
            language answers from files directly.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SearchPage;
// Export dummy default if need be
