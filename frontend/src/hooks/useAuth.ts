import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
    setUser,
  } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      checkAuth();
    }
  }, [token, user, checkAuth]);

  const isAdmin = user?.roles?.includes('admin') || false;
  const isEditor = user?.roles?.includes('editor') || false;
  const isExpert = user?.roles?.includes('expert') || false;

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isEditor,
    isExpert,
    login,
    register,
    logout,
    checkAuth,
    setUser,
  };
}
