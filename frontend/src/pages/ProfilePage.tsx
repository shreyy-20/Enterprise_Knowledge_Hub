import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  Button,
  Divider,
  Chip,
  alpha,
  useTheme,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import toast from 'react-hot-toast';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import BadgeIcon from '@mui/icons-material/Badge';

import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/auth';

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const { user, setUser } = useAuth();

  // Profile Form States
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [deptId, setDeptId] = useState(user?.department_id || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const mockDepartments = [
    { id: 'dept-eng', name: 'Engineering' },
    { id: 'dept-prod', name: 'Product Management' },
    { id: 'dept-data', name: 'Data Science' },
    { id: 'dept-fin', name: 'Finance' },
    { id: 'dept-hr', name: 'Human Resources' },
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSavingProfile(true);
    try {
      const updatedUser = await authApi.updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null,
        department_id: deptId || null,
      });
      setUser(updatedUser);
      toast.success('Profile details updated successfully');
    } catch {
      toast.error('Failed to save profile changes');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to change password. Verify your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Mocked contribution counters
  const contributionStats = {
    docsUploaded: 14,
    ragQueries: 128,
    commentsMade: 26,
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.025em' }}>
        My Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Update your account avatar, select department parameters, and reset system security passwords.
      </Typography>

      <Grid container spacing={3.5}>
        {/* Left Side: Avatar & Stats */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Avatar config card */}
            <Card sx={{ textAlign: 'center' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar
                  src={avatarUrl || undefined}
                  alt={fullName}
                  sx={{
                    width: 110,
                    height: 110,
                    fontSize: '2.5rem',
                    mb: 2.5,
                    border: `4px solid ${theme.palette.primary.main}`,
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  {fullName.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user?.email}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center', mb: 2 }}>
                  {user?.roles?.map((role) => (
                    <Chip
                      key={role}
                      label={role.toUpperCase()}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.68rem', borderRadius: 1.5 }}
                    />
                  ))}
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  label="Avatar Image URL"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>

            {/* Contribution Stats card */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <EqualizerIcon color="secondary" />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Contribution Stats
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Documents Uploaded
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>
                      {contributionStats.docsUploaded}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      AI Queries Run
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>
                      {contributionStats.ragQueries}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Expert Reviews
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>
                      {contributionStats.commentsMade}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Side: Account Details & Password Reset */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3.5}>
            {/* General Info Card */}
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <BadgeIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Profile Details
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <form onSubmit={handleSaveProfile}>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        disabled
                        label="Email Address (read-only)"
                        value={user?.email || ''}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel id="dept-select-label">Corporate Department</InputLabel>
                        <Select
                          labelId="dept-select-label"
                          value={deptId}
                          label="Corporate Department"
                          onChange={(e) => setDeptId(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {mockDepartments.map((dept) => (
                            <MenuItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={savingProfile}
                        sx={{ px: 4, borderRadius: 2 }}
                      >
                        {savingProfile ? 'Saving Details...' : 'Save Profile Details'}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <SecurityIcon color="error" />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Change Account Password
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <form onSubmit={handleChangePassword}>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Verify New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="secondary"
                        disabled={savingPassword}
                        sx={{ px: 4, borderRadius: 2 }}
                      >
                        {savingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
