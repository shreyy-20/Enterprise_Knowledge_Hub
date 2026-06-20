import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  alpha,
  useTheme,
  Stack,
  Skeleton,
} from '@mui/material';
import { motion } from 'framer-motion';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import FolderIcon from '@mui/icons-material/Folder';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { useAuth } from '../hooks/useAuth';
import StatCards from '../components/analytics/StatCards';
import DocumentCard from '../components/documents/DocumentCard';
import UploadDialog from '../components/documents/UploadDialog';
import { analyticsApi } from '../api/analytics';
import { documentsApi } from '../api/documents';
import type { DashboardData, Document, Project } from '../types';
import apiClient from '../api/client';

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();

  // Dialog State
  const [uploadOpen, setUploadOpen] = useState(false);

  // Data States
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadDashboardContent = async () => {
    setLoading(true);
    try {
      // Load dashboard stats
      const dash = await analyticsApi.getDashboard();
      setDashboardData(dash);

      // Load recent documents
      const docsResp = await documentsApi.getDocuments({ size: 3, sort_by: 'created_at', sort_order: 'desc' });
      setRecentDocs(docsResp.items);

      // Load active projects
      const projResp = await apiClient.get<Project[]>('/projects');
      if (projResp.data && Array.isArray(projResp.data)) {
        setActiveProjects(projResp.data.slice(0, 3));
      } else {
        // Mock fallback projects
        setActiveProjects([
          {
            id: 'proj-rag',
            name: 'RAG Integration Engine',
            description: 'Building custom RAG flows with enterprise databases',
            status: 'active',
            department_id: null,
            members: [],
            created_at: new Date().toISOString(),
          },
          {
            id: 'proj-ekh',
            name: 'Enterprise Knowledge Hub',
            description: 'This platform deployment and integrations',
            status: 'active',
            department_id: null,
            members: [],
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardContent();
  }, []);

  const handleUploadSuccess = () => {
    loadDashboardContent();
  };

  // Mock Activity Feed items
  const activityFeed = [
    {
      id: 'act-1',
      user: 'Sarah Jenkins',
      action: 'uploaded',
      target: 'Q3 Financial Guidelines.pdf',
      time: '15 minutes ago',
      icon: <UploadFileIcon color="primary" />,
    },
    {
      id: 'act-2',
      user: 'AI Service',
      action: 'completed vectorization of',
      target: 'Employee Handbook.md',
      time: '45 minutes ago',
      icon: <CheckCircleOutlineIcon color="success" />,
    },
    {
      id: 'act-3',
      user: 'David Miller',
      action: 'queried RAG about',
      target: '"SSO configuration rules"',
      time: '2 hours ago',
      icon: <HistoryIcon color="info" />,
    },
  ];

  // Mock Top search terms
  const topSearchTerms = [
    { term: 'SSO configuration', count: 142 },
    { term: 'RAG pipeline', count: 98 },
    { term: 'holiday calendar 2026', count: 85 },
    { term: 'travel reimbursement policy', count: 64 },
    { term: 'API authorization', count: 53 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <Box>
      {/* Greeting Banner */}
      <Card
        sx={{
          mb: 4,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #111128 0%, #151535 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f1f3f9 100%)',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={8}>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.025em' }}>
                {getGreeting()}, {user?.full_name || 'Guest'}!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                Welcome to your knowledge control tower. All internal repositories are indexed, vector-embedded,
                and prepared for semantic search or summarization.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => setUploadOpen(true)}
                sx={{
                  py: 1.5,
                  px: 3,
                  fontSize: '0.95rem',
                  borderRadius: 2.5,
                }}
              >
                Upload Document
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analytics Summary Stats */}
      <Box sx={{ mb: 4 }}>
        <StatCards data={dashboardData} loading={loading} />
      </Box>

      {/* Main Content Grid */}
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <Grid container spacing={3}>
          {/* Recent Document Uploads */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Recent Document Uploads
                  </Typography>
                  <Button size="small" onClick={() => (window.location.href = '/search')}>
                    View All
                  </Button>
                </Box>
                {loading ? (
                  <Grid container spacing={2}>
                    {[1, 2, 3].map((n) => (
                      <Grid item xs={12} sm={4} key={n}>
                        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 3 }} />
                      </Grid>
                    ))}
                  </Grid>
                ) : recentDocs.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <HelpOutlineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      No documents uploaded yet.
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2.5}>
                    {recentDocs.map((doc) => (
                      <Grid item xs={12} sm={4} key={doc.id}>
                        <DocumentCard document={doc} />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Active Projects */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                  Active Projects
                </Typography>
                {loading ? (
                  <Stack spacing={2}>
                    {[1, 2].map((n) => (
                      <Skeleton key={n} variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
                    ))}
                  </Stack>
                ) : (
                  <List disablePadding>
                    {activeProjects.map((proj, idx) => (
                      <React.Fragment key={proj.id}>
                        {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                        <ListItem disableGutters alignStandard="flex-start" sx={{ px: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 2 }}>
                              <FolderIcon fontSize="small" />
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={proj.name}
                            secondary={proj.description || 'No description provided'}
                            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.88rem' }}
                            secondaryTypographyProps={{ fontSize: '0.78rem', noWrap: true }}
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Feed */}
          <Grid item xs={12} md={6} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                  Activity Feed
                </Typography>
                <List disablePadding>
                  {activityFeed.map((activity, idx) => (
                    <React.Fragment key={activity.id}>
                      {idx > 0 && <Divider sx={{ my: 1.5 }} />}
                      <ListItem disableGutters sx={{ alignItems: 'flex-start', px: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                          <Avatar sx={{ bgcolor: 'action.selected', width: 32, height: 32 }}>
                            {activity.icon}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              <span style={{ fontWeight: 700 }}>{activity.user}</span> {activity.action}{' '}
                              <span style={{ fontWeight: 600, color: theme.palette.primary.main }}>{activity.target}</span>
                            </Typography>
                          }
                          secondary={activity.time}
                          secondaryTypographyProps={{ fontSize: '0.72rem', mt: 0.25 }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Search Terms */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                  Trending Search Queries
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {topSearchTerms.map((term, index) => (
                    <Chip
                      key={index}
                      icon={<AutoGraphIcon sx={{ fontSize: 16 }} />}
                      label={`${term.term} (${term.count})`}
                      onClick={() => (window.location.href = `/search?q=${encodeURIComponent(term.term)}`)}
                      sx={{
                        px: 1,
                        py: 2,
                        borderRadius: 2.5,
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        color: 'primary.main',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'primary.main',
                          color: '#fff',
                          '& svg': { color: '#fff' },
                        },
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </Box>
  );
};

export default DashboardPage;
