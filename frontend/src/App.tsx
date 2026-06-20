import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import DocumentViewerPage from './pages/DocumentViewerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

// Stores & Theme
import { useAuth } from './hooks/useAuth';
import { useThemeStore } from './store/themeStore';
import { createAppTheme } from './theme/theme';

const App: React.FC = () => {
  const { mode } = useThemeStore();
  const theme = createAppTheme(mode);
  const { checkAuth, token, user, isLoading } = useAuth();

  // Load user profile on startup if token is available
  useEffect(() => {
    if (token && !user) {
      checkAuth();
    }
  }, [token, user, checkAuth]);

  if (isLoading && token && !user) {
    return <LoadingSpinner fullPage message="Restoring session..." />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: mode === 'dark' ? '#151530' : '#ffffff',
            color: mode === 'dark' ? '#ffffff' : '#000000',
            border: `1px solid ${mode === 'dark' ? '#3b3b6b' : '#e0e0e0'}`,
            borderRadius: '12px',
            fontSize: '0.875rem',
            padding: '12px 16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          },
          success: {
            duration: 4000,
          },
          error: {
            duration: 5000,
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes using Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard Home */}
            <Route index element={<DashboardPage />} />

            {/* Document Viewer */}
            <Route path="documents/:id" element={<DocumentViewerPage />} />

            {/* Knowledge Search */}
            <Route path="search" element={<SearchPage />} />

            {/* System Analytics */}
            <Route path="analytics" element={<AnalyticsPage />} />

            {/* Admin Panel (Restricted to 'admin' role) */}
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* User Profile */}
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
