import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ChatWidget = ({ conversationId, delivery }) => {
    const { user } = useAuth();
    const navigate = useNavigate(); // Hook for navigation
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    // ... (participantMap and getSenderInfo logic remains the same) ...
    const participantMap = useMemo(() => {
        const map = {};
        if (!delivery) return map;

        // 1. Identify Seller (From Order or Swap)
        if (delivery.orders && delivery.orders.length > 0) {
            const seller = delivery.orders[0].listing?.listed_by;
            if (seller) map[seller.id] = { name: seller.username, role: 'Seller' };

            const buyer = delivery.orders[0].buyer;
            if (buyer) map[buyer.id] = { name: buyer.username, role: 'Buyer' };
        } else if (delivery.swap) {
            // In swaps, sender is usually 'Seller' (initiator) of the delivery context
            const { sender, receiver } = delivery.swap;
            if (sender) map[sender.id] = { name: sender.username, role: 'Swapper A' };
            if (receiver) map[receiver.id] = { name: receiver.username, role: 'Swapper B' };
        }

        // 2. Identify Rider
        if (delivery.rider) {
            map[delivery.rider.id] = { name: delivery.rider.username, role: 'Rider' };
        }

        return map;
    }, [delivery]);

    const getSenderInfo = (senderId) => {
        const id = parseInt(senderId);
        const myId = parseInt(user?.id);

        if (id === myId) return { name: 'Me', role: '' }; // Don't show role for self to save space

        // If found in map, return that info
        if (participantMap[id]) return participantMap[id];

        // Fallback
        return { name: `User`, role: 'Participant' };
    };

    useEffect(() => {
        if (isOpen && conversationId) {
            // Fetch initial messages
            api.get(`conversations/${conversationId}/messages/`)
                .then(res => {
                    setMessages(res.data);
                    scrollToBottom();
                })
                .catch(err => console.error("Chat Load Error", err));

            // WebSocket connection
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use the correct port from your environment or default to 8000
            const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/chat/${conversationId}/`;

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => console.log("Widget WS Connected");

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                setMessages((prev) => [...prev, {
                    id: Date.now(),
                    content: data.message,
                    sender: { id: data.sender_id }, // Ensure structure matches API
                    timestamp: new Date().toISOString()
                }]);
                scrollToBottom();
            };

            ws.current.onerror = (e) => console.error("Widget WS Error", e);
        }

        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [isOpen, conversationId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                message: newMessage,
                sender_id: user.id
            }));
            setNewMessage("");
        }
    };

    const handleOpenFullChat = () => {
        setIsOpen(false); // Close widget
        navigate(`/chat/${conversationId}`); // Go to main chat page
    };

    if (!conversationId) return null;

    return (
        <div className="fixed bottom-24 right-4 z-[2000] flex flex-col items-end font-sans">
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-4 animate-slide-up">

                    {/* Header */}
                    <div className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-md">
                        <div className="flex-1 cursor-pointer" onClick={handleOpenFullChat} title="Open full chat">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <h3 className="font-bold text-sm">Delivery Chat ↗</h3>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                                {delivery ? `Order #${delivery.tracking_code}` : 'Connecting...'}
                            </p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white px-2">✕</button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                        {messages.length === 0 && <p className="text-xs text-center text-gray-400 mt-10">No messages yet.</p>}

                        {messages.map((msg, idx) => {
                            const senderId = msg.sender?.id || msg.sender_id;
                            const isMe = parseInt(senderId) === parseInt(user?.id);
                            const { name, role } = getSenderInfo(senderId);

                            return (
                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-2 rounded-xl text-sm shadow-sm relative ${isMe ? 'bg-slate-800 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                        }`}>
                                        {!isMe && (
                                            <div className="flex justify-between items-center mb-1 gap-2">
                                                {/* Show Role Badge */}
                                                <span className={`text-[8px] px-1 rounded border uppercase font-bold 
                                                    ${role === 'Rider' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                        role === 'Seller' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                            'bg-gray-100 text-gray-600'}`}>
                                                    {role}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-700 truncate">{name}</span>
                                            </div>
                                        )}
                                        <p className="leading-snug break-words">{msg.content}</p>
                                        <p className={`text-[9px] text-right mt-1 ${isMe ? 'text-slate-400' : 'text-gray-400'}`}>
                                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={sendMessage} className="p-2 bg-white border-t flex gap-2">
                        <input
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-gray-50"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message group..."
                        />
                        <button type="submit" className="bg-slate-900 hover:bg-black text-white px-4 rounded-lg text-lg font-bold shadow transition">
                            ➤
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-slate-900 hover:bg-black text-white w-14 h-14 rounded-full shadow-xl transition transform hover:scale-105 flex items-center justify-center border-4 border-white z-[2000]"
            >
                <span className="text-2xl">💬</span>
            </button>
        </div>
    );
};

export default ChatWidget;