import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  alpha,
  useTheme,
  Stack,
} from '@mui/material';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import DownloadIcon from '@mui/icons-material/Download';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

import type { Document } from '../../types';
import { useDocuments } from '../../hooks/useDocuments';

interface DocumentViewerProps {
  documentId: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const {
    currentDocument: document,
    loading,
    error,
    summary,
    summarizing,
    fetchDocument,
    summarizeDocument,
  } = useDocuments();

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId, fetchDocument]);

  const handleDownload = () => {
    if (document?.file_url) {
      window.open(document.file_url, '_blank');
    } else {
      // Create a blob from the content and download it
      const blob = new Blob([document?.content || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document?.title || 'document.txt';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleGenerateSummary = () => {
    if (document) {
      summarizeDocument(document.id);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading document contents...
        </Typography>
      </Box>
    );
  }

  if (error || !document) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || 'Failed to load the document. Please verify the ID.'}
      </Alert>
    );
  }

  // Helper for metadata values
  const getMetadataValue = (key: string): string => {
    if (document.metadata && typeof document.metadata === 'object') {
      const val = (document.metadata as Record<string, unknown>)[key];
      if (val) return String(val);
    }
    return 'N/A';
  };

  // Extract tags/keywords
  const tags: string[] = [];
  if (document.metadata && typeof document.metadata === 'object') {
    const meta = document.metadata as Record<string, unknown>;
    if (Array.isArray(meta.tags)) {
      tags.push(...meta.tags.map(String));
    } else if (typeof meta.tags === 'string') {
      tags.push(...meta.tags.split(',').map((s) => s.trim()));
    } else if (Array.isArray(meta.keywords)) {
      tags.push(...meta.keywords.map(String));
    }
  }

  return (
    <Box>
      {/* Back Button and Header Actions */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2 }}
        >
          Back
        </Button>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{ borderRadius: 2 }}
          >
            Download File
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={summarizing ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleGenerateSummary}
            disabled={summarizing}
            sx={{ borderRadius: 2 }}
          >
            {summarizing ? 'Summarizing...' : 'Generate AI Summary'}
          </Button>
        </Stack>
      </Box>

      {/* Main Grid Area */}
      <Grid container spacing={3}>
        {/* Document Content Panel */}
        <Grid item xs={12} md={8.5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* AI Summary Panel if generated */}
            {(summarizing || summary) && (
              <Card
                sx={{
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
                  background:
                    theme.palette.mode === 'dark'
                      ? alpha(theme.palette.secondary.dark, 0.08)
                      : alpha(theme.palette.secondary.light, 0.05),
                  boxShadow: `0 8px 32px ${alpha(theme.palette.secondary.main, 0.05)}`,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <AutoAwesomeIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                      AI Generated Summary
                    </Typography>
                  </Box>
                  {summarizing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                      <CircularProgress size={20} color="secondary" />
                      <Typography variant="body2" color="text.secondary">
                        Analyzing contents and generating summary...
                      </Typography>
                    </Box>
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        lineHeight: 1.6,
                        color: 'text.primary',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {summary}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Main Rich text viewer */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 4 },
                borderRadius: 4,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? alpha('#111128', 0.5)
                    : '#ffffff',
                minHeight: '60vh',
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
                {document.title}
              </Typography>
              <Divider sx={{ mb: 4 }} />

              <Box
                className="markdown-content"
                sx={{
                  color: 'text.primary',
                  lineHeight: 1.7,
                  '& h1, & h2, & h3, & h4': {
                    fontWeight: 700,
                    mt: 3,
                    mb: 1.5,
                  },
                  '& p': {
                    mb: 2.5,
                  },
                  '& ul, & ol': {
                    mb: 2.5,
                    pl: 3,
                  },
                  '& li': {
                    mb: 1,
                  },
                  '& code': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    px: 0.8,
                    py: 0.2,
                    borderRadius: 1,
                    fontSize: '0.9em',
                    fontFamily: 'monospace',
                  },
                  '& pre': {
                    bgcolor: 'background.default',
                    p: 2,
                    borderRadius: 2.5,
                    overflow: 'auto',
                    mb: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    '& code': {
                      bgcolor: 'transparent',
                      color: 'inherit',
                      p: 0,
                      fontSize: '0.85rem',
                    },
                  },
                  '& blockquote': {
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    ml: 0,
                    pl: 2.5,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    my: 3,
                  },
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    mb: 3,
                    '& th, & td': {
                      border: `1px solid ${theme.palette.divider}`,
                      p: 1.5,
                      textAlign: 'left',
                    },
                    '& th': {
                      bgcolor: 'action.hover',
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <ReactMarkdown>{document.content}</ReactMarkdown>
              </Box>
            </Paper>
          </Box>
        </Grid>

        {/* Sidebar Metadata Panel */}
        <Grid item xs={12} md={3.5}>
          <Card
            sx={{
              position: 'sticky',
              top: 84,
              bgcolor:
                theme.palette.mode === 'dark'
                  ? alpha('#111128', 0.3)
                  : alpha('#ffffff', 0.5),
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Document Details
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              <Stack spacing={2.5}>
                {/* Owner */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Owner
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.25 }}>
                    {document.owner_name}
                  </Typography>
                </Box>

                {/* Project / Department */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Project
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.25 }}>
                    {getMetadataValue('project_name') || getMetadataValue('project') || 'None'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Department
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.25 }}>
                    {getMetadataValue('department_name') || getMetadataValue('department') || 'Enterprise'}
                  </Typography>
                </Box>

                {/* File format */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Format / Extension
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.25, textTransform: 'uppercase' }}>
                    {document.file_type} File
                  </Typography>
                </Box>

                {/* Created Date */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Created On
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {format(new Date(document.created_at), 'MMMM d, yyyy h:mm a')}
                  </Typography>
                </Box>

                {/* Modified Date */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Last Modified
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {format(new Date(document.updated_at), 'MMMM d, yyyy h:mm a')}
                  </Typography>
                </Box>

                {/* Tags / Keywords */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, display: 'block', mb: 1 }}>
                    Keywords & Tags
                  </Typography>
                  {tags.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No keywords attached
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {tags.map((tag, idx) => (
                        <Chip
                          key={`${tag}-${idx}`}
                          label={tag}
                          size="small"
                          sx={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderRadius: 1.5,
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentViewer;
