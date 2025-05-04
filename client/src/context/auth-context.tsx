import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'not_specified';
  role: 'customer' | 'seller';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSeller: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string, 
    password: string, 
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    gender: 'male' | 'female' | 'not_specified',
    role: 'customer' | 'seller'
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);

  const {
    data: user,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  useEffect(() => {
    if (queryError) {
      setError(queryError as Error);
    }
  }, [queryError]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiRequest('POST', '/api/auth/login', credentials);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Login realizado com sucesso',
        description: 'Bem-vindo de volta!',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: 'Erro no login',
        description: error.message || 'Verifique suas credenciais e tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { 
      email: string; 
      password: string; 
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: 'male' | 'female' | 'not_specified';
      role: 'customer' | 'seller';
    }) => {
      return apiRequest('POST', '/api/auth/register', userData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Cadastro realizado com sucesso',
        description: 'Sua conta foi criada com sucesso!',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Não foi possível criar sua conta. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.invalidateQueries();
      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta com sucesso.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: 'Erro ao sair',
        description: error.message || 'Não foi possível sair da sua conta. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (
    email: string, 
    password: string, 
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    gender: 'male' | 'female' | 'not_specified',
    role: 'customer' | 'seller'
  ) => {
    await registerMutation.mutateAsync({ 
      email, 
      password, 
      firstName,
      lastName,
      dateOfBirth,
      gender,
      role
    });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isSeller: user?.role === 'seller',
    isLoading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function for auth queries
function getQueryFn<T>({ on401 }: { on401: 'returnNull' | 'throw' }): () => Promise<T | null> {
  return async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (on401 === 'returnNull' && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Auth query error:', error);
      throw error;
    }
  };
}
