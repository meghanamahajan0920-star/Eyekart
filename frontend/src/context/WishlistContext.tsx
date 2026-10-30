import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistContextType {
  wishlist: Product[];
  wishlistCount: number;
  loading: boolean;
  isInWishlist: (productId: number) => boolean;
  addToWishlist: (product: Product) => Promise<boolean>;
  removeFromWishlist: (productId: number) => Promise<boolean>;
  toggleWishlist: (product: Product) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }
    try {
      setLoading(true);
      const items = await api.getWishlist();
      setWishlist(items);
    } catch (err: unknown) {
      console.warn("Could not fetch wishlist:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshWishlist();
    } else {
      setWishlist([]);
    }
  }, [isAuthenticated, user?.id, refreshWishlist]);

  const isInWishlist = useCallback((productId: number): boolean => {
    return wishlist.some(item => item.id === productId);
  }, [wishlist]);

  const addToWishlist = async (product: Product): Promise<boolean> => {
    if (!isAuthenticated) {
      showToast('Please sign in to save items to your wishlist', 'info');
      return false;
    }
    if (isInWishlist(product.id)) {
      return true;
    }
    try {
      const res = await api.addToWishlist(product.id);
      setWishlist(res.wishlist || [...wishlist, product]);
      showToast(`${product.name} added to wishlist!`, 'success');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add to wishlist';
      showToast(msg, 'error');
      return false;
    }
  };

  const removeFromWishlist = async (productId: number): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }
    try {
      const res = await api.removeFromWishlist(productId);
      setWishlist(res.wishlist || wishlist.filter(p => p.id !== productId));
      showToast('Item removed from wishlist', 'info');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not remove from wishlist';
      showToast(msg, 'error');
      return false;
    }
  };

  const toggleWishlist = async (product: Product): Promise<boolean> => {
    if (!isAuthenticated) {
      showToast('Please sign in to save items to your wishlist', 'info');
      return false;
    }
    if (isInWishlist(product.id)) {
      return await removeFromWishlist(product.id);
    } else {
      return await addToWishlist(product);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        loading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        refreshWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistProvider;
