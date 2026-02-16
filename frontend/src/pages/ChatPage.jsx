import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages } from '../utils/api';

const ChatPage = () => {
    const { user } = useAuth();
    const { conversationId } = useParams();
    const navigate = useNavigate();

    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);

    const wsRef = useRef(null);
    const messageListRef = useRef(null);

    // --- SMART PARTICIPANT MAPPING (FIXED) ---
    const participantMap = useMemo(() => {
        const map = {};
        if (!activeChat) return map;

        // 1. Delivery Logic (For Group/Order Chats)
        if (activeChat.delivery) {
            const d = activeChat.delivery;

            // Identify Rider
            if (d.rider) {
                map[d.rider.id] = { name: d.rider.username, role: 'Rider', color: 'bg-yellow-100 text-yellow-800' };
            }

            // Identify Seller & Buyer (from Orders)
            if (d.orders && d.orders.length > 0) {
                const order = d.orders[0];
                if (order.buyer) {
                    map[order.buyer.id] = { name: order.buyer.username, role: 'Buyer', color: 'bg-blue-100 text-blue-800' };
                }
                if (order.listing && order.listing.listed_by) {
                    map[order.listing.listed_by.id] = { name: order.listing.listed_by.username, role: 'Seller', color: 'bg-purple-100 text-purple-800' };
                }
            }

            // Identify Swappers
            if (d.swap) {
                const { sender, receiver } = d.swap;
                if (sender) map[sender.id] = { name: sender.username, role: 'Swapper A', color: 'bg-orange-100 text-orange-800' };
                if (receiver) map[receiver.id] = { name: receiver.username, role: 'Swapper B', color: 'bg-cyan-100 text-cyan-800' };
            }
        }

        // 2. Normal Chat Logic (FIX FOR NORMAL CHATS)
        // If the 'other_user' exists (which it does for 1-on-1 chats), add them to the map.
        if (activeChat.other_user) {
            // We only add them if they aren't already mapped (to avoid overwriting a specific role like 'Seller')
            if (!map[activeChat.other_user.id]) {
                map[activeChat.other_user.id] = {
                    name: activeChat.other_user.username,
                    role: '', // No role badge for normal chats
                    color: ''
                };
            }
        }

        return map;
    }, [activeChat]);

    const getSenderInfo = (senderId) => {
        if (!senderId) return { name: 'Unknown', role: '', color: 'bg-gray-100' };

        // Handle "Me"
        if (parseInt(senderId) === parseInt(user.id)) {
            return { name: 'Me', role: '', color: '' };
        }

        // Handle Others
        return participantMap[parseInt(senderId)] || {
            name: `User ${senderId}`,
            role: '',
            color: 'text-gray-600'
        };
    };
    // -------------------------------------

    // Load Conversations
    useEffect(() => {
        getConversations()
            .then(res => {
                setConversations(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Set Active Chat from URL
    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            const chat = conversations.find(c => c.id === parseInt(conversationId));
            if (chat) setActiveChat(chat);
        }
    }, [conversationId, conversations]);

    // Handle Messages & WebSocket
    useEffect(() => {
        if (!activeChat) return;

        setMessages([]);
        getMessages(activeChat.id).then(res => {
            setMessages(res.data);
            scrollToBottom();
        });

        if (wsRef.current) wsRef.current.close();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/chat/${activeChat.id}/`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages((prev) => [...prev, {
                id: Date.now(),
                content: data.message,
                sender: { id: data.sender_id }, // WS only sends ID
                timestamp: new Date().toISOString()
            }]);
            scrollToBottom();
        };

        wsRef.current = ws;
        return () => ws.close();
    }, [activeChat]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }, 100);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim() || !wsRef.current) return;
        wsRef.current.send(JSON.stringify({ message: inputText, sender_id: user.id }));
        setInputText('');
    };

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-64px)]">
            <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                {/* Sidebar */}
                <div className={`w-full md:w-1/3 border-r bg-gray-50 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 bg-white border-b shadow-sm"><h2 className="font-bold text-xl text-gray-800">Messages</h2></div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map(chat => (
                            <div key={chat.id} onClick={() => { setActiveChat(chat); navigate(`/chat/${chat.id}`); }}
                                className={`p-4 border-b cursor-pointer hover:bg-green-50 ${activeChat?.id === chat.id ? 'bg-green-100 border-l-4 border-l-green-600' : ''}`}>
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-gray-900 truncate pr-2">
                                        {chat.delivery ? `Order #${chat.delivery.tracking_code}` : (chat.other_user?.username || 'User')}
                                    </span>
                                    <span className="text-[10px] text-gray-400 shrink-0">{new Date(chat.updated_at).toLocaleDateString()}</span>
                                </div>
                                <div className="text-xs text-green-700 font-bold mb-1 truncate">
                                    {chat.delivery ? "📦 Delivery Chat" : (chat.listing?.textbook?.title || "Inquiry")}
                                </div>
                                <div className="text-sm text-gray-500 truncate">{chat.last_message || "No messages"}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Window */}
                <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                    {activeChat ? (
                        <>
                            <div className="p-4 border-b bg-white shadow-sm flex items-center gap-3 z-10">
                                <button onClick={() => { setActiveChat(null); navigate('/chat'); }} className="md:hidden">←</button>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">
                                        {activeChat.delivery ? `Order #${activeChat.delivery.tracking_code}` : (activeChat.other_user?.username || 'Chat')}
                                    </h3>
                                    {activeChat.delivery && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">Group Chat</span>}
                                </div>
                            </div>

                            <div ref={messageListRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] bg-opacity-30">
                                {messages.map((msg, idx) => {
                                    const senderId = msg.sender?.id || msg.sender_id;
                                    const isMe = parseInt(senderId) === parseInt(user.id);
                                    const { name, role, color } = getSenderInfo(senderId);

                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] px-4 py-2 rounded-lg shadow-sm text-sm ${isMe ? 'bg-green-600 text-white' : 'bg-white text-gray-800'}`}>
                                                {/* Only show label for others */}
                                                {!isMe && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {role && <span className={`text-[10px] font-bold px-1 rounded uppercase ${color}`}>{role}</span>}
                                                        <span className="text-[10px] font-bold text-gray-700">{name}</span>
                                                    </div>
                                                )}
                                                <p className="break-words leading-snug">{msg.content}</p>
                                                <span className={`text-[10px] block text-right mt-1 opacity-70 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={handleSend} className="p-4 border-t bg-gray-50 flex gap-2">
                                <input className="flex-1 border rounded-full px-4 py-2" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type a message..." />
                                <button type="submit" className="bg-green-600 text-white p-2 rounded-full w-10 h-10 shadow">➤</button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <span className="text-4xl mb-2">💬</span>
                            <p>Select a conversation to start</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;