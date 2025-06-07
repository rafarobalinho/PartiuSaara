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
  role: 'customer' | 'seller' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSeller: boolean;
  isAdmin: boolean;
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
  // DIAGNÓSTICO: Log de inicialização do AuthProvider
  console.log('🔍 [AUTH-CONTEXT]', {
    function: 'AuthProvider-init',
    url: window.location.href,
    timestamp: new Date().toISOString()
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Função para navegar (pode ser implementada com useLocation se necessário)
  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Verificação inteligente de autenticação
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('🔍 [AUTH-CONTEXT] Iniciando verificação de auth');
      
      setIsLoading(true);
      
      const { isValid, user } = await verifyAuthToken();
      
      if (isValid && user) {
        setUser(user);
        setIsAuthenticated(true);
        console.log('✅ [AUTH-CONTEXT] Usuário autenticado:', user.id);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log('❌ [AUTH-CONTEXT] Usuário não autenticado');
        
        // APENAS redirecionar se não estiver em páginas públicas
        const publicRoutes = ['/', '/login', '/register', '/payment/callback'];
        const currentPath = window.location.pathname;
        
        if (!publicRoutes.some(route => currentPath.startsWith(route))) {
          console.log('🔄 [AUTH-CONTEXT] Redirecionando para login');
          navigate('/login');
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  const {
    data: queryUser,
    isLoading: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: false, // Desabilitar query automática, usar verificação manual
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
    user: user || queryUser,
    isAuthenticated: isAuthenticated || !!queryUser,
    isSeller: (user || queryUser)?.role === 'seller',
    isAdmin: (user || queryUser)?.role === 'admin',
    isLoading: isLoading || queryLoading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value as AuthContextType}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Função melhorada de verificação de token
const verifyAuthToken = async () => {
  console.log('🔐 [AUTH-CONTEXT] Verificando token...');
  
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (!token) {
    console.log('❌ [AUTH-CONTEXT] Nenhum token encontrado');
    return { isValid: false, user: null };
  }
  
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ [AUTH-CONTEXT] Token válido', { userId: userData.id });
      return { isValid: true, user: userData };
    } else {
      console.log('❌ [AUTH-CONTEXT] Token inválido - status:', response.status);
      // Remover token inválido
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      return { isValid: false, user: null };
    }
  } catch (error) {
    console.error('🚨 [AUTH-CONTEXT] Erro na verificação:', error);
    return { isValid: false, user: null };
  }
};

// Helper function for auth queries
function getQueryFn<T>({ on401 }: { on401: 'returnNull' | 'throw' }): () => Promise<T | null> {
  return async () => {
    // DIAGNÓSTICO: Log de verificação de autenticação
    console.log('🔍 [AUTH-CONTEXT]', {
      function: 'getQueryFn-check',
      url: window.location.href,
      on401Strategy: on401,
      timestamp: new Date().toISOString()
    });

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

      const userData = await res.json();

      // Buscar as lojas do usuário se ele estiver autenticado
      if (userData?.id) {
        console.log('[DEBUG-AUTH-CONTEXT] 🔍 Buscando lojas para usuário ID:', userData.id);
        try {
          const storesResponse = await fetch('/api/stores', {
            credentials: 'include',
          });
          console.log('[DEBUG-AUTH-CONTEXT] 📡 Resposta /api/stores - Status:', storesResponse.status);
          if (storesResponse.ok) {
            const storesData = await storesResponse.json();
            console.log('[DEBUG-AUTH-CONTEXT] 🏪 Lojas carregadas no contexto:', storesData);
            console.log('[DEBUG-AUTH-CONTEXT] 📊 Quantidade de lojas:', storesData?.length || 0);
            userData.stores = storesData;
          } else {
            console.log('[DEBUG-AUTH-CONTEXT] ❌ Erro na resposta /api/stores:', storesResponse.statusText);
            userData.stores = [];
          }
        } catch (storesError) {
          console.error('[DEBUG-AUTH-CONTEXT] ❌ Erro ao carregar lojas do usuário:', storesError);
          userData.stores = [];
        }
      } else {
        console.log('[DEBUG-AUTH-CONTEXT] ❌ Usuário não autenticado, não buscando lojas');
      }

      return userData;
    } catch (error) {
      console.error('Auth query error:', error);
      throw error;
    }
  };
}