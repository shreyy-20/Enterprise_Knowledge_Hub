import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  message?: string;
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  fullPage = false,
  message = 'Loading...',
  size = 48,
}) => {
  const theme = useTheme();

  const spinner = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `3px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: theme.palette.primary.main,
            borderRightColor: theme.palette.secondary.main,
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: theme.palette.secondary.main,
            borderLeftColor: theme.palette.primary.light,
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: '35%',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
        />
      </Box>
      {message && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
          >
            {message}
          </Typography>
        </motion.div>
      )}
    </Box>
  );

  if (fullPage) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
        }}
      >
        {spinner}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
      }}
    >
      {spinner}
    </Box>
  );
};

export default LoadingSpinner;
