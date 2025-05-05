import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';

interface UserStats {
  wishlistCount: number;
  reservationsCount: number;
  favoriteStoresCount: number;
}

interface WishlistItem {
  id: number;
  userId: number;
  productId: number;
}

interface UiContextType {
  // Contadores
  wishlistCount: number;
  reservationsCount: number;
  
  // Lista de IDs de produtos favoritos
  favoriteProductIds: number[];
  
  // Métodos para verificar e atualizar favoritos
  isProductFavorite: (productId: number) => boolean;
  addFavoriteProduct: (productId: number) => void;
  removeFavoriteProduct: (productId: number) => void;
  
  // Métodos para atualizar contadores
  incrementWishlistCount: () => void;
  decrementWishlistCount: () => void;
  incrementReservationsCount: () => void;
  decrementReservationsCount: () => void;
  
  // Método para sincronizar com o servidor
  syncCounters: () => void;
  syncFavorites: () => void;
}

// Valores padrão para o contexto
const defaultContextValue: UiContextType = {
  wishlistCount: 0,
  reservationsCount: 0,
  favoriteProductIds: [],
  isProductFavorite: () => false,
  addFavoriteProduct: () => {},
  removeFavoriteProduct: () => {},
  incrementWishlistCount: () => {},
  decrementWishlistCount: () => {},
  incrementReservationsCount: () => {},
  decrementReservationsCount: () => {},
  syncCounters: async () => {},
  syncFavorites: async () => {},
};

const UiContext = createContext<UiContextType>(defaultContextValue);

export function UiProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Estado local para os contadores
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [reservationsCount, setReservationsCount] = useState<number>(0);
  
  // Estado local para os produtos favoritos
  const [favoriteProductIds, setFavoriteProductIds] = useState<number[]>([]);
  
  // Consulta para obter as estatísticas atualizadas do usuário
  const { data: userData } = useQuery({
    queryKey: ['/api/users/me'],
    enabled: isAuthenticated,
  });
  
  // Consulta para obter os produtos favoritos
  const { data: favoriteData } = useQuery({
    queryKey: ['/api/wishlist'],
    enabled: isAuthenticated,
    onSuccess: (data: WishlistItem[]) => {
      if (Array.isArray(data)) {
        const productIds = data.map(item => item.productId);
        setFavoriteProductIds(productIds);
      }
    }
  });

  // Sincroniza os contadores com os dados do servidor quando disponíveis
  useEffect(() => {
    if (userData?.stats) {
      setWishlistCount(userData.stats.wishlistCount || 0);
      setReservationsCount(userData.stats.reservationsCount || 0);
    }
  }, [userData]);
  
  // Sincroniza os favoritos quando os dados são carregados
  useEffect(() => {
    if (favoriteData && Array.isArray(favoriteData)) {
      const productIds = favoriteData.map(item => item.productId);
      setFavoriteProductIds(productIds);
    }
  }, [favoriteData]);
  
  // Sincroniza os contadores e favoritos quando o status de autenticação muda
  useEffect(() => {
    if (!isAuthenticated) {
      // Zera os contadores e favoritos quando o usuário não está autenticado
      setWishlistCount(0);
      setReservationsCount(0);
      setFavoriteProductIds([]);
    }
  }, [isAuthenticated]);

  // Verifica se um produto está na lista de favoritos
  const isProductFavorite = (productId: number): boolean => {
    return favoriteProductIds.includes(productId);
  };
  
  // Adiciona um produto à lista de favoritos local
  const addFavoriteProduct = (productId: number) => {
    if (!favoriteProductIds.includes(productId)) {
      setFavoriteProductIds(prev => [...prev, productId]);
    }
  };
  
  // Remove um produto da lista de favoritos local
  const removeFavoriteProduct = (productId: number) => {
    setFavoriteProductIds(prev => prev.filter(id => id !== productId));
  };

  // Método para sincronizar os contadores com o servidor
  const syncCounters = async () => {
    if (isAuthenticated) {
      await queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    }
  };
  
  // Método para sincronizar os favoritos com o servidor
  const syncFavorites = async () => {
    if (isAuthenticated) {
      await queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
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
    favoriteProductIds,
    isProductFavorite,
    addFavoriteProduct,
    removeFavoriteProduct,
    incrementWishlistCount,
    decrementWishlistCount,
    incrementReservationsCount,
    decrementReservationsCount,
    syncCounters,
    syncFavorites,
  };

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

// Hook para usar o contexto da UI
export function useUi() {
  return useContext(UiContext);
}