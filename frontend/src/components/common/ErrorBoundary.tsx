import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            px: 4,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)}, ${alpha(theme.palette.error.light, 0.05)})`,
              mb: 3,
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'text.secondary', mb: 1, maxWidth: 500 }}
          >
            An unexpected error occurred. Please try again or refresh the page.
          </Typography>
          {this.state.error && (
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                mb: 3,
                px: 2,
                py: 1,
                borderRadius: 1,
                background: (theme) => alpha(theme.palette.error.main, 0.05),
                fontFamily: 'monospace',
                maxWidth: 500,
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={this.handleReset} startIcon={<RefreshIcon />}>
              Try Again
            </Button>
            <Button variant="contained" onClick={this.handleReload} startIcon={<RefreshIcon />}>
              Reload Page
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
