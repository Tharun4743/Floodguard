import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { MessageSquare, Send, Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ChatMessage {
  id: number;
  message: string;
  timestamp: string;
  user_id: number;
  user_name: string;
  user_role: string;
}

const ChatCoordination: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchChatHistory = async () => {
    try {
      const response = await api.get('/api/chat');
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Set up socket listener
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join log
    console.log('Chat room socket connected');

    // Listen for new messages incoming
    newSocket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socket || !user) return;

    // Emit send message event to backend
    socket.emit('send_message', {
      user_id: user.id,
      message: typedMessage,
    });

    setTypedMessage('');
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-950 text-red-400 border border-red-900';
      case 'coordinator': return 'bg-purple-950 text-purple-400 border border-purple-900';
      case 'responder': return 'bg-blue-950 text-blue-400 border border-blue-900';
      default: return 'bg-gray-950 text-gray-400 border border-gray-850';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      <div className="border-b border-gray-800 pb-3 flex-shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <span>Swarm Coordination Chat</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Real-time coordination channel. Please coordinate evacuation plans, rescues, and sensor statuses.
        </p>
      </div>

      {/* Messages Feed panel */}
      <div className="flex-1 bg-gray-950 bg-opacity-40 border border-gray-850 rounded-2xl p-4 overflow-y-auto space-y-4 scroll-container min-h-0">
        <div className="p-3 bg-blue-950 bg-opacity-10 border border-blue-900 border-opacity-20 rounded-xl text-[11px] text-blue-400 flex items-start space-x-2.5">
          <Info className="h-4.5 w-4.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">This coordination room links all logged-in authorities and evacuees. Messages are persisted and indexed in the swarm database logs.</p>
        </div>

        {messages.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">No messages. Begin coordination below.</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                {/* Sender name & role label */}
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-400">{msg.user_name}</span>
                  <span className={`text-[8px] uppercase px-1 rounded font-mono font-bold ${getRoleBadgeStyle(msg.user_role)}`}>
                    {msg.user_role}
                  </span>
                  <span className="text-[8px] text-gray-600 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSendMessage} className="flex space-x-2 flex-shrink-0">
        <input
          type="text"
          value={typedMessage}
          onChange={(e) => setTypedMessage(e.target.value)}
          className="flex-1 bg-gray-950 border border-gray-850 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 px-4 text-white text-xs outline-none"
          placeholder="Transmit coordination instructions..."
        />
        <button
          type="submit"
          className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition shadow-lg shadow-blue-900 shadow-opacity-35"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
};

export default ChatCoordination;
