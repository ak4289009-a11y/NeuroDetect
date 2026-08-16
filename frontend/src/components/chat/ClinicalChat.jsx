import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, Send, Check, CheckCheck, User, ShieldAlert } from 'lucide-react';
import { messageAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ClinicalChat = ({ userRole }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const activePartnerIdRef = useRef(activePartnerId);
  useEffect(() => {
    activePartnerIdRef.current = activePartnerId;
  }, [activePartnerId]);

  // Fetch Conversations List
  const fetchConversations = async () => {
    try {
      const res = await messageAPI.getConversations();
      const list = Array.isArray(res.data) ? res.data : [];
      setConversations(list);
      if (list.length > 0 && !activePartnerIdRef.current) {
        setActivePartnerId(list[0].partner_user_id);
      }
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch History for Active Conversation
  const fetchHistory = async (partnerId) => {
    if (!partnerId) return;
    try {
      const res = await messageAPI.getConversationHistory(partnerId);
      setMessages(res.data);
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activePartnerId) {
      fetchHistory(activePartnerId);
      const historyInterval = setInterval(() => fetchHistory(activePartnerId), 3000);
      return () => clearInterval(historyInterval);
    }
  }, [activePartnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartnerId) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      await messageAPI.sendMessage({
        receiver_user_id: activePartnerId,
        message_text: textToSend
      });
      fetchHistory(activePartnerId);
      fetchConversations();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to send message.";
      alert(msg);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.partner_name.toLowerCase().includes(q) || c.partner_info.toLowerCase().includes(q);
  });

  const activeConversation = conversations.find(c => c.partner_user_id === activePartnerId);

  if (loading) {
    return <div className="p-8 text-center text-xs text-gray-500 font-medium">Loading clinical messages...</div>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[70vh]">
      {/* Left Panel: Conversations List */}
      <div className="w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50/50 shrink-0">
        <div className="p-3 border-b border-gray-200 space-y-2">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Clinical Conversations</span>
          </h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder={userRole === 'DOCTOR' ? "Search patient..." : "Search doctor..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500 font-medium space-y-1">
              <p className="font-semibold text-gray-700">No authorized conversations found.</p>
              {userRole === 'PATIENT' && (
                <p className="text-[11px] text-gray-500 leading-normal pt-1">
                  Direct messaging unlocks automatically once a doctor approves your MRI report or confirms an appointment consultation.
                </p>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.partner_user_id}
                onClick={() => setActivePartnerId(conv.partner_user_id)}
                className={`w-full p-3 text-left transition-colors flex items-start justify-between gap-2 ${
                  activePartnerId === conv.partner_user_id ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-gray-100/80'
                }`}
              >
                <div className="overflow-hidden space-y-0.5">
                  <h4 className="font-bold text-xs text-gray-900 truncate">{conv.partner_name}</h4>
                  <p className="text-[11px] text-gray-500 font-medium truncate">{conv.partner_info}</p>
                  <p className="text-[11px] text-gray-600 truncate">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Active Chat Room */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-sm text-gray-900">{activeConversation.partner_name}</h3>
                <p className="text-xs text-gray-500 font-medium">{activeConversation.partner_info}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-blue-600" /> Secure Clinical Channel
              </span>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 italic">
                  No messages yet. Send a message to start conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_user_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl p-3 space-y-1 shadow-sm ${
                        isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.message_text}</p>
                        <div className={`text-[10px] flex items-center gap-1 justify-end ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-200" /> : <Check className="w-3 h-3 text-blue-200" />)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 flex items-center gap-2 bg-white">
              <input
                type="text"
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
            Select an authorized conversation to view messages.
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalChat;
