import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Added imports
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages } from '../utils/api';
import { createWsClient } from '../utils/ws';

const ChatPage = () => {
    const { user } = useAuth();
    const { conversationId } = useParams(); // Get ID from URL
    const navigate = useNavigate();

    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);

    // 1. Load Conversations
    useEffect(() => {
        getConversations().then(res => setConversations(res.data));
    }, []);

    // 2. Handle URL ID changes (e.g. redirected from "Message Seller")
    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            // Find the chat that matches the ID in the URL
            const targetChat = conversations.find(c => c.id === parseInt(conversationId));
            if (targetChat) {
                setActiveChat(targetChat);
            }
        }
    }, [conversationId, conversations]);

    // 3. Connect to WebSocket when activeChat changes
    useEffect(() => {
        if (!activeChat) return;

        getMessages(activeChat.id).then(res => setMessages(res.data));

        const ws = createWsClient(`/ws/chat/${activeChat.id}/`, (data) => {
            setMessages((prev) => [...prev, {
                sender: { id: data.sender_id },
                content: data.message,
                timestamp: new Date().toISOString()
            }]);
        });

        wsRef.current = ws;
        return () => ws.close();
    }, [activeChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleChatClick = (chat) => {
        setActiveChat(chat);
        navigate(`/chat/${chat.id}`); // Update URL when clicking sidebar
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim() || !wsRef.current) return;

        wsRef.current.send(JSON.stringify({
            message: inputText,
            sender_id: user.id
        }));
        setInputText('');
    };

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-64px)]">
            <div className="flex h-full bg-white rounded-lg shadow overflow-hidden border">
                {/* Sidebar */}
                <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
                    <div className="p-4 bg-gray-100 font-bold border-b">Messages</div>
                    {conversations.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => handleChatClick(chat)} // Updated handler
                            className={`p-4 border-b cursor-pointer hover:bg-green-50 ${activeChat?.id === chat.id ? 'bg-green-100' : ''}`}
                        >
                            <div className="font-medium">{chat.other_user?.username || 'Unknown'}</div>
                            <div className="text-sm text-gray-500 truncate">{chat.last_message}</div>
                        </div>
                    ))}
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col">
                    {activeChat ? (
                        <>
                            <div className="p-4 border-b font-bold bg-white">
                                {activeChat.other_user?.username}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.sender.id === user.id;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-lg ${isMe ? 'bg-green-600 text-white' : 'bg-white border text-gray-800'}`}>
                                                <p>{msg.content}</p>
                                                <span className={`text-xs block mt-1 ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2">
                                <input
                                    className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Type a message..."
                                />
                                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700">
                                    Send
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Select a conversation
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;