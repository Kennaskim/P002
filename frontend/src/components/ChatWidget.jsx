import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ChatWidget = ({ conversationId }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    // 1. Fetch History & Connect WS when opened
    useEffect(() => {
        if (isOpen && conversationId) {
            // A. Load existing messages
            api.get(`conversations/${conversationId}/messages/`)
                .then(res => setMessages(res.data))
                .catch(err => console.error("Chat Load Error", err));

            // B. Connect to EXISTING WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Note: Connecting to your EXISTING chat route
            ws.current = new WebSocket(`${protocol}//127.0.0.1:8000/ws/chat/${conversationId}/`);

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                // The consumer broadcasts { type: 'chat_message', message: '...', sender_id: ... }
                // We adapt it to match the API message structure if needed
                setMessages((prev) => [...prev, {
                    id: Date.now(), // Temp ID
                    content: data.message,
                    sender: { id: data.sender_id, username: data.sender_username || "Partner" },
                    timestamp: new Date().toISOString()
                }]);
                scrollToBottom();
            };
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
        if (newMessage.trim() && ws.current) {
            // Send to WebSocket (Matches your consumers.py expectation)
            ws.current.send(JSON.stringify({
                message: newMessage,
                sender_id: user.id
            }));
            setNewMessage("");
        }
    };

    if (!conversationId) return null; // Don't show if no chat exists

    return (
        <div className="fixed bottom-24 right-4 z-[2000] flex flex-col items-end font-sans">
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-4 animate-slide-up">
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <h3 className="font-bold text-sm">Delivery Chat</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender.id === user.id;
                            return (
                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-2 rounded-xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                        }`}>
                                        {!isMe && <p className="text-[10px] font-bold text-gray-500 mb-1">{msg.sender.username}</p>}
                                        <p>{msg.content}</p>
                                        <p className={`text-[9px] text-right mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="p-2 bg-white border-t flex gap-2">
                        <input
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-sm font-bold shadow-md transition">
                            ➤
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-xl transition transform hover:scale-105 flex items-center justify-center border-4 border-white"
            >
                <span className="text-2xl">💬</span>
                {/* Optional: Add unread badge logic here later */}
            </button>
        </div>
    );
};

export default ChatWidget;