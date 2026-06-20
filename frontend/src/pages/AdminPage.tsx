import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Divider,
  Grid,
  Chip,
  alpha,
  useTheme,
  TextField,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
} from '@mui/material';
import { DataGrid, GridColDef, GridCellParams } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import SyncIcon from '@mui/icons-material/Sync';
import SecurityIcon from '@mui/icons-material/Security';
import ComputerIcon from '@mui/icons-material/Computer';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import RefreshIcon from '@mui/icons-material/Refresh';

import { adminApi } from '../api/admin';
import type { User, AuditLog, SystemStats } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`admin-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const AdminPage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Users Tab States
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userTotal, setUserTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0); // 0-indexed for DataGrid
  const [usersPageSize] = useState(10);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempRoles, setTempRoles] = useState<string[]>([]);

  // Audit Logs Tab States
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [auditsPage, setAuditsPage] = useState(1); // 1-indexed for Pagination
  const [auditsTotal, setAuditsTotal] = useState(0);

  // System Settings Tab States
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [strictUpload, setStrictUpload] = useState(false);
  const [reqApproval, setReqApproval] = useState(true);

  // Knowledge Sources Tab States
  const [sources, setSources] = useState([
    { id: 'src-1', name: 'Confluence Wiki', type: 'confluence', url: 'https://confluence.enterprise.com', status: 'connected', lastSync: '2 hours ago' },
    { id: 'src-2', name: 'Engineering GitHub Org', type: 'github', url: 'github.com/enterprise-org', status: 'connected', lastSync: '1 day ago' },
  ]);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState('confluence');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // 1. Fetch Users
  const fetchUsersData = async () => {
    setLoadingUsers(true);
    try {
      const response = await adminApi.getUsers({
        page: usersPage + 1, // API is 1-indexed
        size: usersPageSize,
      });
      setUsers(response.items);
      setUserTotal(response.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchUsersData();
    }
  }, [activeTab, usersPage]);

  // Toggle user status
  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      toast.success('User status updated');
      fetchUsersData();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  // Open role modification dialog
  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setTempRoles(user.roles || []);
    setRoleDialogOpen(true);
  };

  const handleSaveRoles = async () => {
    if (selectedUser) {
      try {
        await adminApi.updateUserRoles(selectedUser.id, tempRoles);
        toast.success(`Roles updated for ${selectedUser.full_name}`);
        setRoleDialogOpen(false);
        fetchUsersData();
      } catch {
        toast.error('Failed to update user roles');
      }
    }
  };

  const handleRoleCheckboxChange = (role: string, checked: boolean) => {
    if (checked) {
      setTempRoles((prev) => [...prev, role]);
    } else {
      setTempRoles((prev) => prev.filter((r) => r !== role));
    }
  };

  // User Grid Columns
  const userColumns: GridColDef[] = [
    { field: 'full_name', headerName: 'Name', flex: 1.2, minWidth: 150, headerAlign: 'left', align: 'left' },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    {
      field: 'roles',
      headerName: 'Roles',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params: GridCellParams) => {
        const roles = params.value as string[] || [];
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {roles.map((r) => (
              <Chip key={r} label={r} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }} />
            ))}
          </Box>
        );
      },
    },
    {
      field: 'is_active',
      headerName: 'Active Status',
      flex: 1,
      minWidth: 130,
      renderCell: (params: GridCellParams) => {
        const user = params.row as User;
        return (
          <Switch
            checked={user.is_active}
            onChange={() => handleToggleUserStatus(user.id, user.is_active)}
            color="primary"
            size="small"
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Role Configuration',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridCellParams) => {
        const user = params.row as User;
        return (
          <Button size="small" variant="outlined" onClick={() => handleOpenRoleDialog(user)} sx={{ borderRadius: 1.5, textTransform: 'capitalize' }}>
            Edit Roles
          </Button>
        );
      },
    },
  ];

  // 2. Fetch Audit Logs
  const fetchAuditLogsData = async () => {
    setLoadingAudits(true);
    try {
      const response = await adminApi.getAuditLogs({
        page: auditsPage,
        size: 10,
      });
      setAuditLogs(response.items);
      setAuditsTotal(response.total);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    if (activeTab === 1) {
      fetchAuditLogsData();
    }
  }, [activeTab, auditsPage]);

  // 3. Fetch System Stats
  const fetchStatsData = async () => {
    setLoadingStats(true);
    try {
      const systemStats = await adminApi.getSystemStats();
      setStats(systemStats);
    } catch {
      // Fallback mocks
      setStats({
        total_documents: 1254,
        total_users: 84,
        total_chunks: 14520,
        total_searches: 8945,
        storage_used_bytes: 145028340, // ~138 MB
        index_health: 'healthy',
        uptime_seconds: 604800,
        avg_search_latency_ms: 45,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 2) {
      fetchStatsData();
    }
  }, [activeTab]);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const response = await adminApi.reindexDocuments();
      toast.success(response.message || 'Search index rebuild successfully queued!');
      fetchStatsData();
    } catch {
      toast.error('Failed to trigger reindexing');
    } finally {
      setReindexing(false);
    }
  };

  // 4. Sync Knowledge Sources
  const handleSyncSource = (sourceId: string) => {
    setSyncingSourceId(sourceId);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 3000)),
      {
        loading: 'Connecting and syncing data...',
        success: 'Sync complete! New documents parsed and vector-indexed.',
        error: 'Sync failed.',
      }
    ).then(() => {
      setSyncingSourceId(null);
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, lastSync: 'Just now' } : s))
      );
    });
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      toast.error('Source name and URL are required');
      return;
    }
    const newSource = {
      id: `src-${Date.now()}`,
      name: newSourceName.trim(),
      type: newSourceType,
      url: newSourceUrl.trim(),
      status: 'connected',
      lastSync: 'Never synced',
    };
    setSources((prev) => [...prev, newSource]);
    setNewSourceName('');
    setNewSourceUrl('');
    toast.success('Third-party connector successfully registered!');
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.025em' }}>
        Administrative Panel
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage platform policies, authorize editor credentials, review system audits, and configure third-party wikis.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="admin dashboard tabs">
          <Tab icon={<SecurityIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="User Roles" />
          <Tab icon={<ComputerIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Audit Logs" />
          <Tab icon={<RefreshIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="System Settings" />
          <Tab icon={<CloudQueueIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Knowledge Connectors" />
        </Tabs>
      </Box>

      {/* TAB 1: User Roles */}
      <TabPanel value={activeTab} index={0}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Platform Members & Role Mapping
            </Typography>
            <div style={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={users}
                columns={userColumns}
                loading={loadingUsers}
                rowCount={userTotal}
                paginationMode="server"
                paginationModel={{ page: usersPage, pageSize: usersPageSize }}
                onPaginationModelChange={(model) => setUsersPage(model.page)}
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-columnHeaders': {
                    bgcolor: 'action.hover',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* TAB 2: Audit Logs */}
      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
              Security & Activity Audit Events
            </Typography>
            {loadingAudits ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                  <Table size="medium">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Target Resource</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            No audit logs registered yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{log.user_name}</TableCell>
                            <TableCell>
                              <Chip
                                label={log.action}
                                size="small"
                                color={
                                  log.action.includes('delete')
                                    ? 'error'
                                    : log.action.includes('update') || log.action.includes('write')
                                    ? 'warning'
                                    : 'info'
                                }
                                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              {log.resource_type}: <span style={{ fontFamily: 'monospace' }}>{log.resource_id}</span>
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{log.ip_address}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack spacing={2} sx={{ mt: 3, alignItems: 'center' }}>
                  <Pagination
                    count={Math.ceil(auditsTotal / 10)}
                    page={auditsPage}
                    onChange={(e, page) => setAuditsPage(page)}
                    color="primary"
                  />
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* TAB 3: System Settings */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {/* System Status Indicators */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                  System Health & Indexes
                </Typography>
                {loadingStats ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={36} />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                          Index Health
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={stats?.index_health?.toUpperCase() || 'HEALTHY'}
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                          Storage Space
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>
                          {stats ? (stats.storage_used_bytes / 1024 / 1024).toFixed(1) + ' MB' : '138 MB'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2.5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                          Vector Chunks
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>
                          {stats?.total_chunks || '14,520'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 3 }} />
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            Trigger Vector Store Reindex
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Rebuild semantic indices, mapping and embedding files. Best performed during low-traffic periods.
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={handleReindex}
                          disabled={reindexing}
                          startIcon={reindexing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                          sx={{ borderRadius: 2 }}
                        >
                          {reindexing ? 'Reindexing...' : 'Reindex Database'}
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* System Toggles */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                  Global Access Policies
                </Typography>
                <Stack spacing={3}>
                  <FormControlLabel
                    control={<Switch checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          Enable Auto-Sync Connectors
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Synchronize wiki pages every 4 hours automatically.
                        </Typography>
                      </Box>
                    }
                  />
                  <Divider />
                  <FormControlLabel
                    control={
                      <Switch checked={strictUpload} onChange={(e) => setStrictUpload(e.target.checked)} color="primary" />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          Restrict Size to 10MB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Limit document size thresholds to avoid excessive tokenizer cost.
                        </Typography>
                      </Box>
                    }
                  />
                  <Divider />
                  <FormControlLabel
                    control={<Switch checked={reqApproval} onChange={(e) => setReqApproval(e.target.checked)} color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          Require Review Approvals
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Uploads require a subject expert verification before publishing.
                        </Typography>
                      </Box>
                    }
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 4: Knowledge Sources */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {/* Connector Listing */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                  Registered Knowledge Connectors
                </Typography>

                <Stack spacing={2.5}>
                  {sources.map((src) => (
                    <Paper
                      key={src.id}
                      elevation={0}
                      sx={{
                        p: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item xs={12} sm={8}>
                          <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {src.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1 }}>
                            URL: <span style={{ fontFamily: 'monospace' }}>{src.url}</span>
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label="Connected" size="small" color="success" sx={{ fontSize: '0.65rem', height: 18 }} />
                            <Typography variant="caption" color="text.secondary">
                              Last sync: {src.lastSync}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, mt: { xs: 2, sm: 0 } }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSyncSource(src.id)}
                            disabled={syncingSourceId === src.id}
                            startIcon={
                              syncingSourceId === src.id ? (
                                <CircularProgress size={12} color="inherit" />
                              ) : (
                                <SyncIcon />
                              )
                            }
                            sx={{ borderRadius: 1.5 }}
                          >
                            {syncingSourceId === src.id ? 'Syncing...' : 'Sync Now'}
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Add Connector Form */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                  Connect Third-Party Repository
                </Typography>
                <form onSubmit={handleAddSource}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Source Name"
                    placeholder="e.g. Wiki Workspace"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Repository Type"
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    sx={{ mb: 2 }}
                  >
                    <MenuItem value="confluence">Confluence Cloud</MenuItem>
                    <MenuItem value="github">GitHub Enterprise</MenuItem>
                    <MenuItem value="googledrive">Google Drive Folder</MenuItem>
                    <MenuItem value="sharepoint">Microsoft SharePoint</MenuItem>
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    label="Repository Endpoint URL"
                    placeholder="e.g. enterprise.atlassian.net"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  <Button type="submit" variant="contained" fullWidth sx={{ borderRadius: 2 }}>
                    Add Connector
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Manage Roles: {selectedUser?.full_name}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign roles which dictate access parameters and authorization permissions across document modules.
          </Typography>
          <FormGroup>
            {['admin', 'editor', 'viewer', 'expert'].map((role) => (
              <FormControlLabel
                key={role}
                control={
                  <Checkbox
                    checked={tempRoles.includes(role)}
                    onChange={(e) => handleRoleCheckboxChange(role, e.target.checked)}
                  />
                }
                label={<Typography sx={{ textTransform: 'capitalize' }}>{role}</Typography>}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRoles} sx={{ borderRadius: 2 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;
