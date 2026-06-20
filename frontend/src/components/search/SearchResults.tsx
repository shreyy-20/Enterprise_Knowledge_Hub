import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  LinearProgress,
  Link as MuiLink,
  Divider,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
  Stack,
  Button,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

import type { SearchResult } from '../../types';
import { useSearch } from '../../hooks/useSearch';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  loading: boolean;
  tookMs: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, query, loading, tookMs }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { ragAnswer, ragLoading, askQuestion } = useSearch();

  const [askAiMode, setAskAiMode] = useState(false);

  // Auto-fetch RAG answer when Ask AI Mode is toggled ON and there is a query
  useEffect(() => {
    if (askAiMode && query.trim() && !ragAnswer && !ragLoading) {
      askQuestion(query);
    }
  }, [askAiMode, query, askQuestion, ragAnswer, ragLoading]);

  // Reset Ask AI mode if the query changes
  useEffect(() => {
    setAskAiMode(false);
  }, [query]);

  const handleToggleAskAi = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAskAiMode(event.target.checked);
  };

  const handleDocNavigate = (docId: string) => {
    navigate(`/documents/${docId}`);
  };

  // Helper to render highlights or snippets with HTML tags correctly
  const renderHighlightedSnippet = (snippet: string) => {
    // If the snippet contains HTML tags like <em> or <strong>, render safely
    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(snippet);
    if (hasHtml) {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: snippet
              .replace(/<em>/g, `<em style="color: ${theme.palette.primary.main}; font-weight: 700; background: ${alpha(theme.palette.primary.main, 0.08)}; padding: 1px 4px; border-radius: 4px;">`)
              .replace(/<\/em>/g, '</em>'),
          }}
        />
      );
    }
    return snippet;
  };

  return (
    <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Search Header Info and Ask AI Toggle */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          p: 2,
          borderRadius: 3,
          bgcolor: 'action.hover',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Found <span style={{ fontWeight: 700, color: theme.palette.text.primary }}>{results.length}</span> results{' '}
          {tookMs > 0 && (
            <span>
              in <span style={{ fontWeight: 600 }}>{tookMs}ms</span>
            </span>
          )}
        </Typography>

        {query.trim() && (
          <FormControlLabel
            control={
              <Switch
                checked={askAiMode}
                onChange={handleToggleAskAi}
                color="secondary"
                icon={<HelpOutlineIcon sx={{ fontSize: 18, m: 0.2 }} />}
                checkedIcon={<AutoAwesomeIcon sx={{ fontSize: 18, m: 0.2 }} />}
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Ask AI Assistant (RAG Mode)
              </Typography>
            }
          />
        )}
      </Box>

      {/* AI Assistant Answer Card */}
      {askAiMode && query.trim() && (
        <Card
          sx={{
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
            background:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.secondary.dark, 0.08)
                : alpha(theme.palette.secondary.light, 0.05),
            boxShadow: `0 8px 32px ${alpha(theme.palette.secondary.main, 0.08)}`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                AI Answer
              </Typography>
            </Box>

            {ragLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <CircularProgress size={24} color="secondary" />
                <Typography variant="body2" color="text.secondary">
                  Searching knowledge base and formulating response...
                </Typography>
              </Box>
            ) : ragAnswer ? (
              <Box>
                {/* RAG Answer Markdown */}
                <Box
                  sx={{
                    lineHeight: 1.7,
                    fontSize: '0.95rem',
                    color: 'text.primary',
                    '& p': { mb: 2 },
                    '& ul, & ol': { pl: 3, mb: 2 },
                    '& li': { mb: 0.5 },
                  }}
                >
                  <ReactMarkdown>{ragAnswer.answer}</ReactMarkdown>
                </Box>

                {/* Sources & Citations */}
                {ragAnswer.sources && ragAnswer.sources.length > 0 && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: `1px dashed ${theme.palette.divider}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                      Sources cited:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {ragAnswer.sources.map((src, index) => (
                        <Chip
                          key={`${src.document_id}-${index}`}
                          icon={<ArrowForwardIcon sx={{ fontSize: '10px !important' }} />}
                          label={src.title}
                          variant="outlined"
                          size="small"
                          onClick={() => handleDocNavigate(src.document_id)}
                          sx={{
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            '&:hover': {
                              bgcolor: 'action.selected',
                            },
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="warning">
                Could not retrieve an answer from the AI assistant. Please try adjusting your query.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Results Listing */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Searching database...
          </Typography>
        </Box>
      ) : results.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
          <HelpOutlineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            No results found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
            We couldn&apos;t find matching records. Try checking spelling, using other keywords, or adjusting filters.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {results.map((result, idx) => {
            // Calculate relevance percentage
            const scorePercent = Math.min(100, Math.max(0, Math.round(result.score * 100)));

            return (
              <Card
                key={`${result.document_id}-${idx}`}
                sx={{
                  bgcolor:
                    theme.palette.mode === 'dark'
                      ? alpha('#111128', 0.2)
                      : '#ffffff',
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateX(4px)',
                    borderColor: 'primary.main',
                    boxShadow: theme.shadows[2],
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Top Bar with score & links */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <MuiLink
                        component="button"
                        variant="h6"
                        onClick={() => handleDocNavigate(result.document_id)}
                        sx={{
                          textAlign: 'left',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          textDecoration: 'none',
                          color: 'text.primary',
                          cursor: 'pointer',
                          '&:hover': {
                            color: 'primary.main',
                          },
                        }}
                      >
                        {result.title}
                      </MuiLink>
                    </Box>

                    {/* Relevance Progress */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: 140, flexShrink: 0 }}>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                            RELEVANCE
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700 }}>
                            {scorePercent}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={scorePercent}
                          color={scorePercent > 80 ? 'success' : scorePercent > 50 ? 'primary' : 'warning'}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Highlighting Snippet */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.6,
                      fontSize: '0.88rem',
                      fontStyle: 'normal',
                    }}
                  >
                    {renderHighlightedSnippet(result.snippet)}
                  </Typography>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      size="small"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => handleDocNavigate(result.document_id)}
                      sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      View Full Document
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default SearchResults;
