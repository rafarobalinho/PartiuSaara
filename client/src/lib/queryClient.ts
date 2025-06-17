import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Verificar se houve redirecionamento para login ou página de erro
    if (res.status === 401 || res.status === 403) {
      console.error('Erro de autenticação:', res.status);

      // Se estamos em produção e não estamos na página de login, redirecionar
      if (window.location.pathname !== '/login' && window.location.pathname !== '/auth') {
        console.warn('Redirecionando para tela de login devido a erro de autenticação');
        // Armazenar URL atual para retornar após login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        // Verificar se estamos em um ambiente não-cliente (SSR/buildtime)
        if (typeof window !== 'undefined') {
          window.location.href = '/auth';
          // Lançar erro para interromper a execução
          throw new Error('Sessão expirada ou usuário não autenticado');
        }
      }
    }

    // Verificar o tipo de conteúdo da resposta
    const contentType = res.headers.get('content-type');

    try {
      // Se o contentType indica JSON, tentar fazer parse
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        throw new Error(data.message || `${res.status}: ${res.statusText}`);
      } else {
        // Se não for JSON, obter como texto
        const text = await res.text();

        // Detectar HTML (típico em erros de servidor ou redirecionamentos)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('Resposta HTML recebida onde JSON era esperado:', {
            status: res.status,
            url: res.url,
            htmlPreview: text.substring(0, 150) + '...'
          });
          throw new Error(`Erro ${res.status}: Resposta HTML recebida onde JSON era esperado`);
        }

        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (e) {
      // Se ocorrer erro no parsing do JSON
      if (e instanceof SyntaxError) {
        console.error('Erro de sintaxe JSON na resposta:', e);
        const text = await res.text();
        console.error('Conteúdo da resposta inválida:', text.substring(0, 200));
        throw new Error(`Erro de sintaxe na resposta do servidor: ${e.message}`);
      }
      // Repassa o erro original
      throw e;
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options: {
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<Response> {
  const isFormData = data instanceof FormData;

  const headers = {
    // Só adiciona Content-Type se não for FormData
    // O navegador define o Content-Type automaticamente para FormData
    ...(data && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...options.headers
  };

  try {
    // Opcionalmente implementar timeout para evitar requisições penduradas
    const timeoutMs = options.timeout || 30000; // 30 segundos padrão

    // Criar uma promise de timeout
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Requisição excedeu o tempo limite de ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Criar a promise da requisição fetch
    const fetchPromise = fetch(url, {
      method,
      headers,
      // Se for FormData, envia o FormData diretamente, senão converte para JSON
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
      credentials: "include",
    });

    // Usar Promise.race para implementar o timeout
    const res = await Promise.race([fetchPromise, timeoutPromise]);

    // Verificar especificamente erros CORS antes de prosseguir
    if (res.type === 'opaque' || res.type === 'error') {
      console.error('Possível erro CORS na requisição para:', url);
      throw new Error('Erro de acesso ao servidor. Verifique as configurações CORS.');
    }

    // Verificar se há problemas de rede antes de verificar o status da resposta
    if (!res.ok) {
      // Log detalhado para depuração
      console.warn('Resposta de erro da API:', {
        url,
        method,
        status: res.status,
        statusText: res.statusText,
        type: res.type,
        contentType: res.headers.get('content-type'),
      });
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('Erro na requisição para', url, error);

    // Verificar se é um erro de rede
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Erro de conexão. Verifique sua conexão com a internet.');
    }

    // Repassa o erro original
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Criar o timeout de forma similar ao apiRequest
      const timeoutMs = 30000; // 30 segundos padrão

      // Criar uma promise de timeout
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Requisição excedeu o tempo limite de ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Criar a promise da requisição fetch
      const fetchPromise = fetch(queryKey[0] as string, {
        credentials: "include",
      });

      // Usar Promise.race para implementar o timeout
      const res = await Promise.race([fetchPromise, timeoutPromise]);

      // Tratamento específico para 401 conforme a opção
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Verificar problemas CORS
      if (res.type === 'opaque' || res.type === 'error') {
        console.error('Possível erro CORS na consulta para:', queryKey[0]);
        throw new Error('Erro de acesso ao servidor. Verifique as configurações CORS.');
      }

      // Verificar tipo de conteúdo antes de processar
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Resposta não-JSON recebida:', contentType);
      }

      await throwIfResNotOk(res);

      try {
        return await res.json();
      } catch (jsonError) {
        console.error('Erro ao processar JSON da resposta:', jsonError);
        throw new Error('A resposta do servidor não é um JSON válido');
      }
    } catch (error) {
      console.error('Erro na consulta para', queryKey[0], error);
      throw error;
    }
  };

import { QueryClient } from '@tanstack/react-query';

// Configuração do QueryClient com configurações otimizadas
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)
      retry: (failureCount, error: any) => {
        // Não fazer retry em erros 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Fazer retry até 3 vezes para outros erros
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Função helper para invalidar queries específicas
export const invalidateQueries = (queryKey: string[]) => {
  return queryClient.invalidateQueries({ queryKey });
};

// Função helper para definir dados de query
export const setQueryData = (queryKey: string[], data: any) => {
  return queryClient.setQueryData(queryKey, data);
};

// Função helper para obter dados de query
export const getQueryData = (queryKey: string[]) => {
  return queryClient.getQueryData(queryKey);
};