import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCart, addToCart as apiAddToCart, removeFromCart as apiRemoveFromCart } from '../utils/api';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
    const { notify } = useNotification();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch cart whenever the user logs in
    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            setCart(null);
        }
    }, [user]);

    const fetchCart = async () => {
        try {
            const response = await getCart();
            setCart(response.data);
        } catch (error) {
            console.error("Failed to fetch cart", error);
        }
    };

    const addToCart = async (listingId) => {
        try {
            const response = await apiAddToCart(listingId);
            setCart(response.data);
            notify("Added to cart!", "success");
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Failed to add to cart";
            notify(`⚠️ ${errorMsg}`, "error");
        }
    };

    const removeFromCart = async (cartItemId) => {
        try {
            const response = await apiRemoveFromCart(cartItemId);
            setCart(response.data);
            notify("Removed from cart.", "info");
        } catch (error) {
            console.error("Failed to remove item", error);
            notify("Failed to remove from cart", "error");
        }
    };

    const value = {
        cart,
        loading,
        addToCart,
        removeFromCart
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);