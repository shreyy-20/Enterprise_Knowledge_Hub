import React from 'react';
import { Grid, Card, CardContent, Typography, Box, alpha, useTheme } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import WorkIcon from '@mui/icons-material/Work';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

import type { DashboardData } from '../../types';

interface StatCardsProps {
  data: DashboardData | null;
  loading: boolean;
}

const StatCards: React.FC<StatCardsProps> = ({ data, loading }) => {
  const theme = useTheme();

  // If loading or null, show placeholder numbers
  const totalDocs = data?.total_documents ?? 1254;
  const searchesToday = data?.searches_today ?? 342;
  const totalUsers = data?.total_users ?? 84;
  const activeProjects = data?.active_projects ?? 12;

  const cardConfigs = [
    {
      title: 'Total Documents',
      value: totalDocs,
      trend: '+12.4%',
      isUp: true,
      trendLabel: 'from last month',
      icon: <InsertDriveFileIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
      shadowColor: '#6366f1',
    },
    {
      title: 'Searches Today',
      value: searchesToday,
      trend: '+8.2%',
      isUp: true,
      trendLabel: 'vs yesterday',
      icon: <SearchIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)',
      shadowColor: '#14b8a6',
    },
    {
      title: 'Active Users',
      value: totalUsers,
      trend: '+4.7%',
      isUp: true,
      trendLabel: 'vs last week',
      icon: <PeopleIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
      shadowColor: '#a855f7',
    },
    {
      title: 'Active Projects',
      value: activeProjects,
      trend: '-1.5%',
      isUp: false,
      trendLabel: 'completed sprints',
      icon: <WorkIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      shadowColor: '#f59e0b',
    },
  ];

  return (
    <Grid container spacing={3}>
      {cardConfigs.map((card, idx) => (
        <Grid item xs={12} sm={6} md={3} key={idx}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              background: card.gradient,
              color: '#ffffff',
              borderRadius: 4,
              border: 'none',
              boxShadow: `0 8px 24px -4px ${alpha(card.shadowColor, 0.4)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 12px 30px -4px ${alpha(card.shadowColor, 0.6)}`,
              },
            }}
          >
            {/* White overlay element for glassmorphism */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: alpha('#ffffff', 0.03),
                backdropFilter: 'blur(1px)',
                pointerEvents: 'none',
              }}
            />

            <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
              {/* Header: Icon & Title */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    opacity: 0.85,
                  }}
                >
                  {card.title}
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2.5,
                    bgcolor: alpha('#ffffff', 0.15),
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </Box>
              </Box>

              {/* Body: Value */}
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
                {loading ? '...' : card.value.toLocaleString()}
              </Typography>

              {/* Footer: Trend */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: alpha(card.isUp ? '#10b981' : '#ef4444', 0.25),
                    px: 1,
                    py: 0.25,
                    borderRadius: 1.5,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {card.isUp ? (
                    <TrendingUpIcon sx={{ fontSize: 14, mr: 0.25 }} />
                  ) : (
                    <TrendingDownIcon sx={{ fontSize: 14, mr: 0.25 }} />
                  )}
                  {card.trend}
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.72rem', fontWeight: 500 }}>
                  {card.trendLabel}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default StatCards;
