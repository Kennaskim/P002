import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ChatWidget = ({ conversationId, delivery }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    const participantMap = useMemo(() => {
        const map = {};
        if (!delivery) return map;

        if (delivery.orders && delivery.orders.length > 0) {
            const order = delivery.orders[0];

            if (order.buyer) {
                map[order.buyer.id] = { name: order.buyer.username, role: 'Buyer' };
            }
            if (order.listing && order.listing.listed_by) {
                map[order.listing.listed_by.id] = { name: order.listing.listed_by.username, role: 'Seller' };
            }
        }

        if (delivery.swap) {
            const { sender, receiver } = delivery.swap;
            if (sender) map[sender.id] = { name: sender.username, role: 'Swapper A' };
            if (receiver) map[receiver.id] = { name: receiver.username, role: 'Swapper B' };
        }

        return map;
    }, [delivery]);

    const getSenderInfo = (senderId) => {
        const id = parseInt(senderId);
        const myId = parseInt(user.id);

        if (id === myId) return { name: 'Me', role: 'Rider' };

        return participantMap[id] || { name: `User #${id}`, role: 'Partner' };
    };

    useEffect(() => {
        if (isOpen && conversationId) {
            api.get(`conversations/${conversationId}/messages/`)
                .then(res => setMessages(res.data))
                .catch(err => console.error("Chat Load Error", err));

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws.current = new WebSocket(`${protocol}//127.0.0.1:8000/ws/chat/${conversationId}/`);

            ws.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                setMessages((prev) => [...prev, {
                    id: Date.now(),
                    content: data.message,
                    sender: { id: data.sender_id },
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
            ws.current.send(JSON.stringify({
                message: newMessage,
                sender_id: user.id
            }));
            setNewMessage("");
        }
    };

    if (!conversationId) return null;

    return (
        <div className="fixed bottom-24 right-4 z-[2000] flex flex-col items-end font-sans">
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-4 animate-slide-up">

                    <div className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-md">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <h3 className="font-bold text-sm">Delivery Chat</h3>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {delivery ? `Order #${delivery.tracking_code}` : 'Connecting...'}
                            </p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white px-2">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                        {messages.map((msg, idx) => {
                            const senderId = msg.sender?.id || msg.sender_id;
                            const isMe = parseInt(senderId) === user.id;

                            const { name, role } = getSenderInfo(senderId);

                            return (
                                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-2 rounded-xl text-sm shadow-sm relative ${isMe ? 'bg-slate-800 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                        }`}>
                                        {!isMe && (
                                            <div className="flex justify-between items-center mb-1 gap-2">
                                                <span className="text-[10px] font-bold text-orange-600 truncate">{name}</span>
                                                <span className="text-[8px] bg-gray-100 text-gray-500 px-1 rounded border uppercase">{role}</span>
                                            </div>
                                        )}

                                        <p className="leading-snug">{msg.content}</p>

                                        <p className={`text-[9px] text-right mt-1 ${isMe ? 'text-slate-400' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

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