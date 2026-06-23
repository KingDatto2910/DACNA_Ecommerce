"use client";
import { useEffect, useState, useCallback } from 'react';
import { apiGetFavorites, apiAddFavorite, apiRemoveFavorite, FavoriteProduct } from '@/lib/favorites-api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface UseFavoritesResult {
  favorites: FavoriteProduct[];
  favoriteIds: Set<number>;
  loading: boolean;
  toggleFavorite: (productId: number) => Promise<void>;
  isFavorited: (productId: number) => boolean;
  refresh: () => Promise<void>;
}

export function useFavorites(): UseFavoritesResult {
  const { token, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const favoriteIds = new Set(favorites.map(f => f.id));

  const load = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    setLoading(true);
    try {
      const data = await apiGetFavorites(token);
      setFavorites(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load favorites';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = useCallback(async (productId: number) => {
    if (!isAuthenticated || !token) {
      toast.error('Please login to favorite products');
      return;
    }
    const isFav = favoriteIds.has(productId);
    // Optimistic update
    if (isFav) {
      setFavorites(prev => prev.filter(p => p.id !== productId));
    } else {
      setFavorites(prev => [{ id: productId, name: '', price: 0 }, ...prev]);
    }
    try {
      if (isFav) {
        await apiRemoveFavorite(token, productId);
        toast.error('Removed from favorites');
      } else {
        await apiAddFavorite(token, productId);
        toast.success('Added to favorites');
        // Reload full data to populate fields
        load();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Favorite action failed';
      toast.error(msg);
      // rollback
      load();
    }
  }, [favoriteIds, token, isAuthenticated, load]);

  const isFavorited = useCallback((productId: number) => favoriteIds.has(productId), [favoriteIds]);

  return { favorites, favoriteIds, loading, toggleFavorite, isFavorited, refresh: load };
}
