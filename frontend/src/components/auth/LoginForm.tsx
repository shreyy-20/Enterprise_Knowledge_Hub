import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  alpha,
  Link as MuiLink,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import type { LoginCredentials, RegisterData } from '../../types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onRegister: (data: RegisterData) => Promise<void>;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await onLogin(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await onRegister({ email: data.email, password: data.password, full_name: data.full_name });
      setIsRegister(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          mx: 'auto',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                boxShadow: `0 8px 32px ${alpha('#6366f1', 0.35)}`,
              }}
            >
              <AutoGraphIcon sx={{ color: '#fff', fontSize: 30 }} />
            </Box>
          </motion.div>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isRegister
              ? 'Join the Enterprise Knowledge Hub'
              : 'Sign in to your Knowledge Hub'}
          </Typography>
        </Box>

        {!isRegister ? (
          <Box component="form" onSubmit={loginForm.handleSubmit(handleLogin)} noValidate>
            <TextField
              {...loginForm.register('email')}
              fullWidth
              label="Email Address"
              error={!!loginForm.formState.errors.email}
              helperText={loginForm.formState.errors.email?.message}
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              {...loginForm.register('password')}
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              error={!!loginForm.formState.errors.password}
              helperText={loginForm.formState.errors.password?.message}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? (
                        <VisibilityOffIcon sx={{ fontSize: 20 }} />
                      ) : (
                        <VisibilityIcon sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                mb: 2.5,
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              Don&apos;t have an account?{' '}
              <MuiLink
                component="button"
                type="button"
                variant="body2"
                onClick={() => setIsRegister(true)}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              >
                Sign Up
              </MuiLink>
            </Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={registerForm.handleSubmit(handleRegister)} noValidate>
            <TextField
              {...registerForm.register('full_name')}
              fullWidth
              label="Full Name"
              error={!!registerForm.formState.errors.full_name}
              helperText={registerForm.formState.errors.full_name?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              {...registerForm.register('email')}
              fullWidth
              label="Email Address"
              error={!!registerForm.formState.errors.email}
              helperText={registerForm.formState.errors.email?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              {...registerForm.register('password')}
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              error={!!registerForm.formState.errors.password}
              helperText={registerForm.formState.errors.password?.message}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? (
                        <VisibilityOffIcon sx={{ fontSize: 20 }} />
                      ) : (
                        <VisibilityIcon sx={{ fontSize: 20 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              {...registerForm.register('confirmPassword')}
              fullWidth
              label="Confirm Password"
              type="password"
              error={!!registerForm.formState.errors.confirmPassword}
              helperText={registerForm.formState.errors.confirmPassword?.message}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                mb: 2.5,
              }}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              Already have an account?{' '}
              <MuiLink
                component="button"
                type="button"
                variant="body2"
                onClick={() => setIsRegister(false)}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </MuiLink>
            </Typography>
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

export default LoginForm;
