import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCart, addToCart as apiAddToCart, removeFromCart as apiRemoveFromCart } from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
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
            setCart(response.data); // Update state with the new cart from backend
            alert("Added to cart!");
        } catch (error) {
            alert(error.response?.data?.error || "Failed to add to cart");
        }
    };

    const removeFromCart = async (cartItemId) => {
        try {
            const response = await apiRemoveFromCart(cartItemId);
            setCart(response.data); // Update state
        } catch (error) {
            console.error("Failed to remove item", error);
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