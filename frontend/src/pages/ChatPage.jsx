import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages } from '../utils/api';
import { createWsClient } from '../utils/ws';

const getRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString();
};

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

    // 1. Load Conversations
    useEffect(() => {
        getConversations()
            .then(res => {
                setConversations(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // 2. Handle URL ID
    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            const targetChat = conversations.find(c => c.id === parseInt(conversationId));
            if (targetChat) setActiveChat(targetChat);
        }
    }, [conversationId, conversations]);

    // 3. Connect WebSocket
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

    // 4. Auto-Scroll
    useEffect(() => {
        if (messageListRef.current) {
            const { scrollHeight, clientHeight } = messageListRef.current;
            messageListRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
        }
    }, [messages, activeChat]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim() || !wsRef.current) return;
        wsRef.current.send(JSON.stringify({ message: inputText, sender_id: user.id }));
        setInputText('');
    };

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-64px)]">
            <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">

                {/* --- SIDEBAR --- */}
                <div className={`w-full md:w-1/3 border-r bg-gray-50 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 bg-white border-b shadow-sm z-10">
                        <h2 className="font-bold text-xl text-gray-800">Messages</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? <div className="p-4 text-center">Loading...</div> : conversations.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => { setActiveChat(chat); navigate(`/chat/${chat.id}`); }}
                                className={`p-4 border-b cursor-pointer hover:bg-green-50 ${activeChat?.id === chat.id ? 'bg-green-100 border-l-4 border-l-green-600' : ''}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-gray-900 truncate pr-2">
                                        {chat.other_user?.username || 'User'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 shrink-0">{getRelativeDate(chat.updated_at)}</span>
                                </div>
                                <div className="text-xs text-green-700 font-bold mb-1">
                                    📘 {chat.listing?.textbook?.title || "Book Inquiry"}
                                </div>
                                <div className="text-sm text-gray-500 truncate">{chat.last_message}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- CHAT AREA --- */}
                <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                    {activeChat ? (
                        <>
                            <div className="p-4 border-b bg-white shadow-sm flex items-center justify-between z-10">
                                <button onClick={() => navigate('/chat')} className="md:hidden mr-2">←</button>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">
                                        {activeChat.other_user?.username || 'User'}
                                    </h3>
                                    <p className="text-xs text-green-600">Re: {activeChat.listing?.textbook?.title}</p>
                                </div>
                            </div>

                            <div ref={messageListRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] bg-opacity-30">
                                {messages.map((msg, idx) => {
                                    const isMe = (msg.sender?.id || msg.sender_id) === user.id;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] px-4 py-2 rounded-lg shadow-sm text-sm ${isMe ? 'bg-green-600 text-white' : 'bg-white text-gray-800'}`}>
                                                <p>{msg.content}</p>
                                                <span className="text-[10px] block text-right mt-1 opacity-70">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={handleSend} className="p-4 border-t bg-gray-50 flex gap-2">
                                <input
                                    className="flex-1 border rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Type a message..."
                                />
                                <button type="submit" disabled={!inputText.trim()} className="bg-green-600 text-white p-2 rounded-full">➤</button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">Select a chat</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;