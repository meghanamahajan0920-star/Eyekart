import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { CartItem, Product } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, options?: { selected_color?: string; selected_image?: string; variant_id?: number }) => void;
  removeFromCart: (productId: number, selectedColor?: string, variantId?: number) => void;
  increaseQuantity: (productId: number, selectedColor?: string, variantId?: number) => void;
  decreaseQuantity: (productId: number, selectedColor?: string, variantId?: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getCartItemKey = (item: { id: number; selected_color?: string; variant_id?: number }) => {
  return `${item.id}_${item.variant_id ?? ''}_${item.selected_color ?? ''}`;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('eyekart_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('eyekart_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (
    product: Product,
    options?: { selected_color?: string; selected_image?: string; variant_id?: number }
  ) => {
    const selected_color = options?.selected_color ?? product.selected_color ?? product.color;
    const selected_image = options?.selected_image ?? product.selected_image ?? product.image;
    const variant_id = options?.variant_id ?? product.variant_id;

    const newItem: CartItem = {
      ...product,
      selected_color,
      selected_image,
      image: selected_image || product.image,
      variant_id,
      quantity: 1
    };

    const targetKey = getCartItemKey(newItem);

    setCart(prev => {
      const existingIndex = prev.findIndex(item => getCartItemKey(item) === targetKey);
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (id: number, selectedColor?: string, variantId?: number) => {
    setCart(prev => {
      if (selectedColor !== undefined || variantId !== undefined) {
        const targetKey = `${id}_${variantId ?? ''}_${selectedColor ?? ''}`;
        return prev.filter(item => getCartItemKey(item) !== targetKey);
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const increaseQuantity = (id: number, selectedColor?: string, variantId?: number) => {
    setCart(prev => {
      if (selectedColor !== undefined || variantId !== undefined) {
        const targetKey = `${id}_${variantId ?? ''}_${selectedColor ?? ''}`;
        return prev.map(item =>
          getCartItemKey(item) === targetKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return prev.map(item => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item));
    });
  };

  const decreaseQuantity = (id: number, selectedColor?: string, variantId?: number) => {
    setCart(prev => {
      if (selectedColor !== undefined || variantId !== undefined) {
        const targetKey = `${id}_${variantId ?? ''}_${selectedColor ?? ''}`;
        return prev
          .map(item =>
            getCartItemKey(item) === targetKey ? { ...item, quantity: item.quantity - 1 } : item
          )
          .filter(item => item.quantity > 0);
      }
      return prev
        .map(item => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter(item => item.quantity > 0);
    });
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

export default CartProvider;
