import React from 'react';
import { Box, Grid, Typography, Stack, alpha, useTheme } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PeopleIcon from '@mui/icons-material/People';
import { Navigate, useLocation } from 'react-router-dom';

import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  // If already authenticated, redirect to requested page or home
  if (isAuthenticated) {
    const origin = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={origin} replace />;
  }

  const features = [
    {
      icon: <SearchIcon sx={{ fontSize: 24, color: '#818cf8' }} />,
      title: 'AI-Powered Semantic Search',
      description: 'Search by meaning and intent. Find document chunks with high relevance scores instantly.',
    },
    {
      icon: <PsychologyIcon sx={{ fontSize: 24, color: '#2dd4bf' }} />,
      title: 'Conversational RAG Assistant',
      description: 'Ask questions directly and get synthesized answers referenced to verified internal documents.',
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 24, color: '#c084fc' }} />,
      title: 'Expert Discovery Network',
      description: 'Identify subject matter experts based on authors and document contribution histories.',
    },
  ];

  return (
    <Grid container sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Left Pane - Promotional Feature Showcase */}
      <Grid
        item
        xs={false}
        md={6}
        sx={{
          position: 'relative',
          background: 'linear-gradient(135deg, #070719 0%, #15153c 50%, #0d0d29 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          p: 6,
          color: '#ffffff',
          overflow: 'hidden',
          borderRight: `1px solid ${alpha('#818cf8', 0.15)}`,
        }}
      >
        {/* Abstract Light Circles */}
        <Box
          sx={{
            position: 'absolute',
            top: '-15%',
            left: '-15%',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(40px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-15%',
            right: '-15%',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(40px)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 2, maxWidth: 540, mx: 'auto' }}>
          {/* Header Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
            <AutoAwesomeIcon sx={{ fontSize: 32, color: 'primary.light' }} />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Enterprise Knowledge Hub
            </Typography>
          </Box>

          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.15, letterSpacing: '-0.03em' }}>
            The Intelligence Layer for your Organization
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 5, fontSize: '1.05rem', lineHeight: 1.6 }}>
            Consolidate corporate wikis, contracts, documentation, and markdown files. Search with natural language
            and talk directly to your repository metadata using our verified AI models.
          </Typography>

          {/* Features Stack */}
          <Stack spacing={3.5}>
            {features.map((feature, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2.5 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    bgcolor: alpha('#ffffff', 0.05),
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, color: '#ffffff' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Grid>

      {/* Right Pane - Authentication Form */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: theme.palette.mode === 'dark' ? '#080816' : '#f8f9fc',
        }}
      >
        <LoginForm onLogin={login} onRegister={register} />
      </Grid>
    </Grid>
  );
};

export default LoginPage;
