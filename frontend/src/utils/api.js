import axios from "axios";
import { jwtDecode } from 'jwt-decode';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
});
// Interceptor("middleware")
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        // Check if token is expired
        if (decoded.exp < currentTime) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        } else {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const registerUser = (userData) => api.post('auth/register/', userData);
export const getCurrentUser = () => api.get('auth/user/');
export const getListings = (query = '') => api.get(`listings/?q=${query}`);
export const getListingById = (id) => api.get(`listings/${id}/`);
export const createListing = (data) => api.post('listings/', data);
export const getTextbooks = () => api.get('textbooks/');
export const createTextbook = (data) => api.post('textbooks/', data);

export const getBookshops = () => api.get('bookshops/');
export const getSchools = () => api.get('schools/');
export const getSchoolBookLists = (schoolId) => api.get(`schools/${schoolId}/booklists/`);

export const getMyListings = () => api.get('my-listings/');
export const getMyProfile = () => api.get('auth/user/');
export const updateListing = (id, data) => api.patch(`listings/${id}/`, data);

//Password Rest
export const requestPasswordReset = (email) => api.post('password_reset/', { email });
export const confirmPasswordReset = (data) => api.post('password_reset/confirm/', data);

// School and Booskshop features
export const getMyBookLists = () => api.get('my-booklists/');
export const createBookList = (data) => api.post('my-booklists/', data);
export const deleteBookList = (id) => api.delete(`my-booklists/${id}/`);
export const updateMyProfile = (data) => api.patch('my-profile/', data);
export const getFullProfile = () => api.get('my-profile/');
export const addBookToList = (listId, textbookId) => api.post(`my-booklists/${listId}/add_book/`, { textbook_id: textbookId });
export const removeBookFromList = (listId, textbookId) => api.post(`my-booklists/${listId}/remove_book/`, { textbook_id: textbookId });
export const searchTextbooks = (query) => api.get(`textbooks/?search=${query}`)
export const createAndAddBook = (listId, bookData) => api.post(`my-booklists/${listId}/create_and_add_book/`, bookData);

// --- Chat Exports ---
export const getConversations = () => api.get('conversations/');
export const getMessages = (conversationId) => api.get(`conversations/${conversationId}/messages/`);
export const findOrCreateConversation = (userId) => {
    return api.post('conversations/find_or_create/', { user_id: userId });
};
// --- Cart Exports ---
export const getCart = () => api.get('cart/');
export const addToCart = (listingId) => { return api.post('cart/', { listing_id: listingId }); };
export const removeFromCart = (cartItemId) => { return api.delete('cart/', { data: { item_id: cartItemId } }); };

// --- Reviews ---
export const createReview = (data) => api.post('reviews/', data);
export const getUserReviews = (userId) => api.get(`users/${userId}/reviews/`);

// --- Swap Requests ---
export const getMySwaps = () => api.get('swaps/');
export const createSwapRequest = (data) => api.post('swaps/', data);
export const acceptSwap = (id) => api.post(`swaps/${id}/accept/`);
export const rejectSwap = (id) => api.post(`swaps/${id}/reject/`);

export default api;