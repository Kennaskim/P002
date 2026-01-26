import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages } from '../utils/api';
import { createWsClient } from '../utils/ws';

// --- HELPER: Format Date for Separators ---
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
    // NEW: Ref for the SCROLLABLE CONTAINER (not the bottom element)
    const messageListRef = useRef(null);

    // 1. Load Conversations (Sidebar)
    useEffect(() => {
        getConversations()
            .then(res => {
                setConversations(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // 2. Handle URL ID changes
    useEffect(() => {
        if (conversationId && conversations.length > 0) {
            const targetChat = conversations.find(c => c.id === parseInt(conversationId));
            if (targetChat) setActiveChat(targetChat);
        }
    }, [conversationId, conversations]);

    // 3. Connect to WebSocket & Load History
    useEffect(() => {
        if (!activeChat) return;

        getMessages(activeChat.id).then(res => setMessages(res.data));

        const ws = createWsClient(`/ws/chat/${activeChat.id}/`, (data) => {
            setMessages((prev) => {
                return [...prev, {
                    sender: { id: data.sender_id },
                    content: data.message,
                    timestamp: new Date().toISOString()
                }];
            });
        });

        wsRef.current = ws;
        return () => ws.close();
    }, [activeChat]);

    // 4. FIXED AUTO-SCROLL LOGIC
    useEffect(() => {
        if (messageListRef.current) {
            // Scroll the CONTAINER to the bottom, not the whole page
            const { scrollHeight, clientHeight } = messageListRef.current;

            // Instant scroll for new chats, Smooth for new messages
            messageListRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, activeChat]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim() || !wsRef.current) return;

        wsRef.current.send(JSON.stringify({
            message: inputText,
            sender_id: user.id
        }));
        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    let lastDate = null;

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-64px)]">
            <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">

                {/* --- SIDEBAR (Conversations) --- */}
                <div className={`w-full md:w-1/3 border-r bg-gray-50 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 bg-white border-b shadow-sm z-10">
                        <h2 className="font-bold text-xl text-gray-800">Messages</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? <div className="p-4 text-center text-gray-400">Loading...</div> : conversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p>No conversations yet.</p>
                                <p className="text-xs mt-2">Start a chat from a book listing!</p>
                            </div>
                        ) : (
                            conversations.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => { setActiveChat(chat); navigate(`/chat/${chat.id}`); }}
                                    className={`p-4 border-b cursor-pointer transition hover:bg-green-50 group ${activeChat?.id === chat.id ? 'bg-green-100 border-l-4 border-l-green-600' : 'border-l-4 border-l-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-900 group-hover:text-green-800">
                                            {chat.other_user?.username || 'Unknown'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                            {getRelativeDate(chat.updated_at)}
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold text-green-700 mb-1 truncate">
                                        {chat.listing?.textbook?.title ? `📘 ${chat.listing.textbook.title}` : "General Chat"}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">
                                        {chat.last_message || <span className="italic opacity-50">No messages yet</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- CHAT AREA --- */}
                <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                    {activeChat ? (
                        <>
                            {/* Header (This will now stay fixed at the top) */}
                            <div className="p-4 border-b bg-white shadow-sm flex items-center justify-between z-10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => navigate('/chat')} className="md:hidden text-gray-500">
                                        ← Back
                                    </button>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{activeChat.other_user?.username}</h3>
                                        {activeChat.listing && (
                                            <p className="text-xs text-green-600">Re: {activeChat.listing.textbook?.title}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Messages List (WE ATTACH THE REF HERE NOW) */}
                            <div
                                ref={messageListRef}
                                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] bg-opacity-30 scroll-smooth"
                            >
                                {messages.map((msg, idx) => {
                                    const isMe = (msg.sender?.id || msg.sender_id) === user.id;
                                    const dateLabel = getRelativeDate(msg.timestamp);
                                    let showDate = false;

                                    if (dateLabel !== lastDate) {
                                        showDate = true;
                                        lastDate = dateLabel;
                                    }

                                    return (
                                        <React.Fragment key={idx}>
                                            {/* Date Separator */}
                                            {showDate && (
                                                <div className="flex justify-center my-4">
                                                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm">
                                                        {dateLabel}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Message Bubble */}
                                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[75%] px-4 py-2 rounded-lg shadow-sm text-sm relative group ${isMe
                                                        ? 'bg-green-600 text-white rounded-tr-none'
                                                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                                    <span
                                                        className={`text-[10px] block text-right mt-1 opacity-70 ${isMe ? 'text-green-100' : 'text-gray-400'
                                                            }`}
                                                    >
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* Input Area (Stays fixed at bottom) */}
                            <form onSubmit={handleSend} className="p-4 bg-gray-50 border-t flex gap-3 items-center shrink-0">
                                <textarea
                                    className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none overflow-hidden bg-white shadow-sm"
                                    rows="1"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition transform hover:scale-105"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                            <span className="text-6xl mb-4 opacity-50">💬</span>
                            <p className="text-lg font-medium">Select a conversation to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;