import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  InputBase,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Typography,
  Divider,
  ListItemIcon,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

import { useAuth } from '../../hooks/useAuth';
import { useThemeStore } from '../../store/themeStore';
import { HEADER_HEIGHT } from '../../utils/constants';
import type { Notification } from '../../types';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeStore();

  const [searchVal, setSearchVal] = useState('');
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Simulate or load notifications
  useEffect(() => {
    // In production, you would fetch this from an API
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Document Processed',
        message: 'The PDF "Q3 Financials.pdf" has been indexed successfully.',
        notification_type: 'success',
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
      },
      {
        id: '2',
        title: 'New Project Added',
        message: 'You have been added to the "RAG Integration" project.',
        notification_type: 'info',
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      },
      {
        id: '3',
        title: 'System Reindex Needed',
        message: 'The search indexes are out of sync. Admin action suggested.',
        notification_type: 'warning',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      },
    ];
    setNotifications(mockNotifications);
  }, []);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotifMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleCloseNotifMenu = () => {
    setAnchorElNotif(null);
  };

  const handleNotificationClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotifIcon = (type: Notification['notification_type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon fontSize="small" color="success" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        height: HEADER_HEIGHT,
        zIndex: theme.zIndex.drawer + 1,
        background:
          theme.palette.mode === 'dark'
            ? alpha('#0a0a1a', 0.8)
            : alpha('#ffffff', 0.8),
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
        boxShadow: 'none',
      }}
    >
      <Toolbar
        sx={{
          height: HEADER_HEIGHT,
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2.5 },
        }}
      >
        {/* Left Side: Sidebar Toggle & App Title / Mobile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={onMenuClick}
            edge="start"
            sx={{
              color: 'text.primary',
              p: 1.25,
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Middle: Search Box */}
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            flexGrow: 1,
            maxWidth: { xs: 180, sm: 400, md: 500 },
            mx: 2,
            display: 'flex',
            alignItems: 'center',
            bgcolor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.05)
                : alpha(theme.palette.common.black, 0.04),
            borderRadius: 2.5,
            px: 1.5,
            py: 0.5,
            border: `1px solid ${theme.palette.divider}`,
            transition: theme.transitions.create(['border-color', 'background-color']),
            '&:hover, &:focus-within': {
              borderColor: 'primary.main',
              bgcolor:
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.08)
                  : alpha(theme.palette.common.black, 0.06),
            },
          }}
        >
          <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Quick search across documents..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            fullWidth
            sx={{
              fontSize: '0.875rem',
              color: 'text.primary',
              '& .MuiInputBase-input::placeholder': {
                color: 'text.secondary',
                opacity: 0.7,
              },
            }}
          />
        </Box>

        {/* Right Side: Quick Action Toggles & Profiles */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
          {/* Light/Dark Toggle */}
          <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton onClick={toggleTheme} sx={{ color: 'text.primary' }}>
              {mode === 'dark' ? (
                <LightModeIcon sx={{ fontSize: 22 }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: 22 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Notifications Bell */}
          <Tooltip title="Notifications">
            <IconButton onClick={handleOpenNotifMenu} sx={{ color: 'text.primary' }}>
              <Badge badgeContent={unreadCount} color="error" variant="dot" invisible={unreadCount === 0}>
                <NotificationsIcon sx={{ fontSize: 22 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorElNotif}
            open={Boolean(anchorElNotif)}
            onClose={handleCloseNotifMenu}
            PaperProps={{
              sx: {
                width: 320,
                maxHeight: 400,
                mt: 1.5,
                borderRadius: 3,
                boxShadow: theme.shadows[4],
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
              },
            }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ cursor: 'pointer', fontWeight: 600 }}
                  onClick={() =>
                    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
                  }
                >
                  Mark all read
                </Typography>
              )}
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No new notifications
                </Typography>
              </Box>
            ) : (
              notifications.map((notif) => (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0.5,
                    whiteSpace: 'normal',
                    bgcolor: notif.is_read ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
                    '&:hover': {
                      bgcolor: notif.is_read
                        ? 'action.hover'
                        : alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {getNotifIcon(notif.notification_type)}
                    <Typography variant="subtitle2" sx={{ fontWeight: notif.is_read ? 600 : 800, flexGrow: 1 }}>
                      {notif.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 3 }}>
                    {notif.message}
                  </Typography>
                </MenuItem>
              ))
            )}
          </Menu>

          {/* User Account Menu */}
          <Tooltip title="User Profile">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
              <Avatar
                src={user?.avatar_url || undefined}
                alt={user?.full_name || 'User'}
                sx={{
                  width: 36,
                  height: 36,
                  border: `2px solid ${theme.palette.primary.main}`,
                }}
              >
                {user?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            PaperProps={{
              sx: {
                width: 220,
                mt: 1.5,
                borderRadius: 3,
                boxShadow: theme.shadows[4],
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
              },
            }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {user?.full_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                {user?.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'inline-block',
                  mt: 1,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                }}
              >
                {user?.roles?.[0] || 'Viewer'}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                handleCloseUserMenu();
                navigate('/profile');
              }}
              sx={{ py: 1.25, px: 2.5 }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              My Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleCloseUserMenu();
                logout();
              }}
              sx={{ py: 1.25, px: 2.5, color: 'error.main' }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
