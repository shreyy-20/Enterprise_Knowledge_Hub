import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Divider,
  Stack,
  alpha,
  useTheme,
  Button,
} from '@mui/material';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

import {
  SearchVolumeChart,
  KnowledgeGrowthChart,
  UserActivityChart,
  DocumentTypesDistributionChart,
} from '../components/analytics/Charts';
import { analyticsApi } from '../api/analytics';
import type { TimeSeriesData, TopItem } from '../types';

const AnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  // Filters State
  const [dateRange, setDateRange] = useState('30d');

  // Loading States
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);

  // Data States
  const [searchUsage, setSearchUsage] = useState<TimeSeriesData[]>([]);
  const [knowledgeGrowth, setKnowledgeGrowth] = useState<TimeSeriesData[]>([]);
  const [userActivity, setUserActivity] = useState<TimeSeriesData[]>([]);
  const [topDocs, setTopDocs] = useState<TopItem[]>([]);
  const [topExperts, setTopExperts] = useState<TopItem[]>([]);

  // Mock static distribution for doc types (normally calculated on backend or derived)
  const docTypeDistribution = [
    { name: 'PDF Documents', value: 480 },
    { name: 'Word files (DOCX)', value: 320 },
    { name: 'Markdown (MD)', value: 150 },
    { name: 'Text files (TXT)', value: 90 },
    { name: 'Spreadsheets (CSV)', value: 64 },
  ];

  // Fetch charts data based on dateRange
  useEffect(() => {
    const fetchChartsData = async () => {
      setLoadingCharts(true);
      try {
        const [searchData, growthData, activityData] = await Promise.all([
          analyticsApi.getSearchUsage(dateRange),
          analyticsApi.getKnowledgeGrowth(dateRange),
          analyticsApi.getUserActivity(dateRange),
        ]);
        setSearchUsage(searchData);
        setKnowledgeGrowth(growthData);
        setUserActivity(activityData);
      } catch (err) {
        console.error('Failed to load chart analytics', err);
      } finally {
        setLoadingCharts(false);
      }
    };
    fetchChartsData();
  }, [dateRange]);

  // Fetch tables data
  useEffect(() => {
    const fetchTablesData = async () => {
      setLoadingTables(true);
      try {
        const [docs, experts] = await Promise.all([
          analyticsApi.getTopDocuments(5),
          analyticsApi.getTopExperts(5),
        ]);
        setTopDocs(docs);
        setTopExperts(experts);
      } catch (err) {
        console.error('Failed to load table analytics', err);
      } finally {
        setLoadingTables(false);
      }
    };
    fetchTablesData();
  }, []);

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header and Filter */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.025em' }}>
            System Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor search usage, knowledge growth, and top-performing documents and authors.
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="analytics-range-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            Range
          </InputLabel>
          <Select
            labelId="analytics-range-label"
            value={dateRange}
            label="Range"
            onChange={(e) => setDateRange(e.target.value)}
          >
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
            <MenuItem value="1y">Last 1 Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Charts Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Search Trend */}
        <Grid item xs={12} md={6}>
          {loadingCharts ? (
            <Card sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Card>
          ) : (
            <SearchVolumeChart data={searchUsage} />
          )}
        </Grid>

        {/* Knowledge Growth */}
        <Grid item xs={12} md={6}>
          {loadingCharts ? (
            <Card sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Card>
          ) : (
            <KnowledgeGrowthChart data={knowledgeGrowth} />
          )}
        </Grid>

        {/* User Activity */}
        <Grid item xs={12} md={6}>
          {loadingCharts ? (
            <Card sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Card>
          ) : (
            <UserActivityChart data={userActivity} />
          )}
        </Grid>

        {/* Document Types Distribution */}
        <Grid item xs={12} md={6}>
          <DocumentTypesDistributionChart data={docTypeDistribution} />
        </Grid>
      </Grid>

      {/* Tables Row */}
      <Grid container spacing={3}>
        {/* Top Documents Table */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <FileOpenIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Top Documents (Most Viewed)
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {loadingTables ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : topDocs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No view statistics recorded yet.
                </Typography>
              ) : (
                <TableContainer component={Box}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Views</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topDocs.map((doc) => (
                        <TableRow
                          key={doc.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                            {doc.name}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {doc.value}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              endIcon={<ArrowForwardIcon />}
                              onClick={() => navigate(`/documents/${doc.id}`)}
                              sx={{ p: 0, minWidth: 0, textTransform: 'capitalize' }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Experts Table */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <PersonPinIcon color="secondary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Top Knowledge Contributors
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {loadingTables ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : topExperts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No contributors recorded yet.
                </Typography>
              ) : (
                <TableContainer component={Box}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Expert</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Contributions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topExperts.map((expert) => (
                        <TableRow
                          key={expert.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  fontSize: '0.75rem',
                                  bgcolor: 'secondary.main',
                                }}
                              >
                                {expert.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {expert.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            {String(expert.metadata?.department || 'Engineering')}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                            {expert.value} docs
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsPage;
