import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

import { useAuth } from '../../hooks/useAuth';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH, HEADER_HEIGHT } from '../../utils/constants';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onToggle,
  mobileOpen,
  onMobileClose,
  isMobile,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const navigationItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Knowledge Search', icon: <SearchIcon />, path: '/search' },
    { text: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
    ...(isAdmin ? [{ text: 'Admin Panel', icon: <AdminPanelSettingsIcon />, path: '/admin' }] : []),
    { text: 'User Profile', icon: <PersonIcon />, path: '/profile' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: theme.palette.mode === 'dark' ? '#070714' : '#ffffff',
        color: 'text.primary',
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          px: open ? 2.5 : 1.5,
          gap: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            flexShrink: 0,
          }}
        >
          <AutoGraphIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        {open && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Knowledge Hub
          </Typography>
        )}
      </Box>

      {/* Navigation Links */}
      <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const isSelected =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  justifyContent: open ? 'initial' : 'center',
                  px: 2,
                  py: 1.25,
                  minHeight: 48,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                    color: isSelected ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.2s',
                    '& svg': {
                      fontSize: 22,
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'primary.main' : 'text.primary',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      {/* User Card at the Bottom */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: open ? 1.5 : 0.5,
            borderRadius: 3,
            bgcolor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.03)
                : alpha(theme.palette.common.black, 0.02),
            border: `1px solid ${open ? theme.palette.divider : 'transparent'}`,
            transition: 'all 0.2s',
            overflow: 'hidden',
          }}
        >
          <Avatar
            src={user?.avatar_url || undefined}
            alt={user?.full_name || 'User'}
            sx={{
              width: 36,
              height: 36,
              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            {user?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
          </Avatar>

          {open && (
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.full_name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  display: 'block',
                  mt: 0.25,
                }}
              >
                {user?.roles?.[0] || 'Viewer'}
              </Typography>
            </Box>
          )}

          {open && !isMobile && (
            <IconButton onClick={onToggle} size="small" sx={{ p: 0.5 }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {!open && !isMobile && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
            <IconButton
              onClick={onToggle}
              size="small"
              sx={{
                bgcolor: 'action.selected',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: SIDEBAR_WIDTH,
            border: 'none',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      open={open}
      PaperProps={{
        sx: {
          width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
          border: 'none',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
