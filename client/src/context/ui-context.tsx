import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';

interface UserStats {
  wishlistCount: number;
  reservationsCount: number;
  favoriteStoresCount: number;
}

interface UiContextType {
  // Contadores
  wishlistCount: number;
  reservationsCount: number;
  
  // Métodos para atualizar contadores
  incrementWishlistCount: () => void;
  decrementWishlistCount: () => void;
  incrementReservationsCount: () => void;
  decrementReservationsCount: () => void;
  
  // Método para sincronizar com o servidor
  syncCounters: () => void;
}

// Valores padrão para o contexto
const defaultContextValue: UiContextType = {
  wishlistCount: 0,
  reservationsCount: 0,
  incrementWishlistCount: () => {},
  decrementWishlistCount: () => {},
  incrementReservationsCount: () => {},
  decrementReservationsCount: () => {},
  syncCounters: async () => {},
};

const UiContext = createContext<UiContextType>(defaultContextValue);

export function UiProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Estado local para os contadores
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [reservationsCount, setReservationsCount] = useState<number>(0);
  
  // Consulta para obter as estatísticas atualizadas do usuário
  const { data } = useQuery({
    queryKey: ['/api/users/me'],
    enabled: isAuthenticated,
  });

  // Sincroniza os contadores com os dados do servidor quando disponíveis
  useEffect(() => {
    if (data?.stats) {
      setWishlistCount(data.stats.wishlistCount || 0);
      setReservationsCount(data.stats.reservationsCount || 0);
    }
  }, [data]);
  
  // Sincroniza os contadores quando o status de autenticação muda
  useEffect(() => {
    if (!isAuthenticated) {
      // Zera os contadores quando o usuário não está autenticado
      setWishlistCount(0);
      setReservationsCount(0);
    }
  }, [isAuthenticated]);

  // Método para sincronizar os contadores com o servidor
  const syncCounters = async () => {
    if (isAuthenticated) {
      await queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    }
  };

  // Métodos para atualizar os contadores
  const incrementWishlistCount = () => {
    setWishlistCount((prev) => prev + 1);
  };

  const decrementWishlistCount = () => {
    setWishlistCount((prev) => Math.max(0, prev - 1));
  };

  const incrementReservationsCount = () => {
    setReservationsCount((prev) => prev + 1);
  };

  const decrementReservationsCount = () => {
    setReservationsCount((prev) => Math.max(0, prev - 1));
  };

  // Objeto de valor para o contexto
  const value: UiContextType = {
    wishlistCount,
    reservationsCount,
    incrementWishlistCount,
    decrementWishlistCount,
    incrementReservationsCount,
    decrementReservationsCount,
    syncCounters,
  };

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

// Hook para usar o contexto da UI
export function useUi() {
  return useContext(UiContext);
}