/**
 * ChatWindow — WhatsApp-style messaging component
 * 
 * Features:
 * - Left panel: Conversation list with participant names, last message, unread badges
 * - Right panel: Active thread with messages, header, and composer
 * - Correct participant names (candidate sees recruiter, recruiter sees candidate)
 * - Message bubbles (right for own, left for received)
 * - Read/unread status
 * - Query param support (?c=conversationId)
 * - Auto-scroll to bottom
 * - Polling for updates
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/ChatWindow.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationItem {
  id: number;
  candidate_name: string;
  recruiter_name: string;
  last_message_preview: string;
  last_message_at: string | null;
  unread_count: number;
  other_user_name: string;
  other_user_id: number | null;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  receiver_user_id: number;
  sender_name: string;
  receiver_name: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatWindow() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread'>('all');
  const [onlineStatus, setOnlineStatus] = useState<{[key: number]: boolean}>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConversationsRef = useRef<string>('');
  const prevMessagesRef = useRef<string>('');

  const currentUserId = user?.user_id || 0;

  // ─── Get Selected Conversation (must be before useEffects that depend on it) ──

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  // ─── Load Conversations ───────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.getDirectConversations();
      
      // Only update state if data actually changed (prevent twitching)
      const newDataStr = JSON.stringify(res.data);
      if (prevConversationsRef.current !== newDataStr) {
        setConversations(res.data);
        prevConversationsRef.current = newDataStr;
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      setError(err.response?.data?.detail || 'Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  // ─── Load Messages ────────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (convId: number) => {
    if (!convId) return;
    
    setLoadingMsgs(true);
    try {
      const res = await apiClient.getConversationMessages(convId, 50, 0);
      
      // Only update state if data actually changed (prevent twitching)
      const newDataStr = JSON.stringify(res.data);
      if (prevMessagesRef.current !== newDataStr) {
        setMessages(res.data);
        prevMessagesRef.current = newDataStr;
      }
      
      setError(null);
      
      // Only mark as read if there are unread messages for current user
      const hasUnreadMessages = res.data.some(
        (msg: Message) => !msg.is_read && Number(msg.receiver_user_id) === Number(currentUserId)
      );
      
      if (hasUnreadMessages) {
        await apiClient.markDirectConversationRead(convId);
        
        // Update unread count locally
        setConversations(prev =>
          prev.map(c =>
            c.id === convId ? { ...c, unread_count: 0 } : c
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.response?.data?.detail || 'Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }
  }, [currentUserId]);

  // ─── Send Message ─────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!selectedConvId || !messageInput.trim() || sending) return;
    
    setSending(true);
    try {
      const res = await apiClient.sendDirectMessage(selectedConvId, messageInput.trim());
      const newMessages = [...messages, res.data];
      setMessages(newMessages);
      // Update ref to prevent polling from resetting messages
      prevMessagesRef.current = JSON.stringify(newMessages);
      setMessageInput('');
      setError(null);
      
      // Update conversation list (move to top, update preview)
      await loadConversations();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ─── Handle Conversation Select ──────────────────────────────────────────────

  const selectConversation = (convId: number) => {
    // Clear previous messages cache when switching conversations
    prevMessagesRef.current = '';
    setSelectedConvId(convId);
    // Preserve existing params, only update 'c'
    setSearchParams(prev => {
      const next = new URLSearchParams (prev);
      next.set('c', convId.toString());
      return next;
    }, { replace: true });
    loadMessages(convId);
  };

  // ─── Auto-scroll to Bottom ────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Initialize: Load conversations and restore selected from URL ─────────────

  useEffect(() => {
    loadConversations();
    
    const cParam = searchParams.get('c');
    if (cParam) {
      const convId = parseInt(cParam, 10);
      if (!isNaN(convId)) {
        setSelectedConvId(convId);
        loadMessages(convId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // ─── Heartbeat (Update Own Presence) ──────────────────────────────────────────

  useEffect(() => {
    // Send heartbeat every 30 seconds to maintain online status
    const sendHeartbeat = async () => {
      try {
        await apiClient.sendHeartbeat();
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };
    
    // Send immediately
    sendHeartbeat();
    
    const interval = setInterval(sendHeartbeat, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  // ─── Fetch Online Status for Selected Conversation ────────────────────────────

  useEffect(() => {
    if (!selectedConv?.other_user_id) return;
    
    const fetchOnlineStatus = async () => {
      try {
        const res = await apiClient.getUserOnlineStatus(selectedConv.other_user_id);
        setOnlineStatus(prev => ({
          ...prev,
          [selectedConv.other_user_id]: res.data.is_online
        }));
      } catch (err) {
        console.error('Failed to fetch online status:', err);
      }
    };
    
    // Fetch immediately
    fetchOnlineStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchOnlineStatus, 30000);
    return () => clearInterval(interval);
  }, [selectedConv?.other_user_id]);

  // ─── Polling ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Refresh conversations every 5 seconds
    const interval = setInterval(() => {
      loadConversations();
      // Check current selectedConvId from state
      setSelectedConvId(current => {
        if (current) {
          loadMessages(current);
        }
        return current;
      });
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - interval runs independently

  // ─── Keyboard Handlers ────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Filter Conversations ─────────────────────────────────────────────────────

  const filteredConversations = conversations.filter(conv => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = conv.other_user_name.toLowerCase().includes(query);
      const previewMatch = conv.last_message_preview.toLowerCase().includes(query);
      if (!nameMatch && !previewMatch) return false;
    }
    
    // Unread filter
    if (messageFilter === 'unread' && conv.unread_count === 0) return false;
    
    return true;
  });

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="chat-window-v2">
      {/* Left Panel: Conversation List */}
      <div className="conversations-sidebar">
        <div className="conversations-header-v2">
          <h2 className="messages-title">Messages</h2>
          <p className="messages-subtitle">Conversations with recruiters and hiring managers</p>
        </div>
        
        {/* Search Bar */}
        <div className="search-bar-container">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="search-icon">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="message-filters">
          <button
            className={`filter-tab ${messageFilter === 'all' ? 'active' : ''}`}
            onClick={() => setMessageFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tab ${messageFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setMessageFilter('unread')}
          >
            Unread
          </button>
        </div>
        
        {error && (
          <div className="error-banner">{error}</div>
        )}
        
        {loadingConvs ? (
          <div className="loading-state-v2">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state-v2">
            <p>No conversations found</p>
            <small>{searchQuery ? 'Try adjusting your search' : 'Conversations will appear here when started'}</small>
          </div>
        ) : (
          <div className="conversations-list-v2">
            {filteredConversations.map(conv => {
              const initial = conv.other_user_name.charAt(0).toUpperCase();
              const avatarColors = ['#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#fbbf24'];
              const colorIndex = conv.id % avatarColors.length;
              const avatarColor = avatarColors[colorIndex];
              
              return (
                <div
                  key={conv.id}
                  className={`conversation-item-v2 ${selectedConvId === conv.id ? 'active' : ''}`}
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className="conv-avatar-v2" style={{ background: avatarColor }}>
                    {initial}
                  </div>
                  <div className="conv-details-v2">
                    <div className="conv-header-row-v2">
                      <span className="conv-name-v2">{conv.other_user_name}</span>
                      {conv.last_message_at && (
                        <span className="conv-time-v2">{formatTime(conv.last_message_at)}</span>
                      )}
                    </div>
                    <div className="conv-subtitle">
                      {user?.role === 'candidate' ? 'Stripe · Senior Recruiter' : 'Candidate'}
                    </div>
                    <div className="conv-preview-row-v2">
                      <span className="conv-preview-v2">{conv.last_message_preview || 'No messages yet'}</span>
                      {conv.unread_count > 0 && (
                        <span className="unread-badge-v2">{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle Panel: Active Thread */}
      <div className="chat-panel-v2">
        {selectedConv ? (
          <>
            {/* Thread Header */}
            <div className="chat-header-v2">
              <div className="chat-header-left">
                <div className="chat-header-avatar-v2" style={{
                  background: `#${selectedConv.id.toString().padStart(6, '0').substring(0, 6)}`
                }}>
                  {selectedConv.other_user_name.charAt(0).toUpperCase()}
                </div>
                <div className="chat-header-info-v2">
                  <h3 className="chat-title">{selectedConv.other_user_name}</h3>
                  {selectedConv.other_user_id && (
                    <span className="chat-status">
                      <span className={`status-dot ${onlineStatus[selectedConv.other_user_id] ? 'online' : 'offline'}`}></span>
                      {onlineStatus[selectedConv.other_user_id] ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-container-v2">
              {loadingMsgs ? (
                <div className="loading-state-v2">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="empty-state-v2">
                  <p>No messages yet</p>
                  <small>Start the conversation!</small>
                </div>
              ) : (
                <div className="messages-list-v2">
                  <div className="date-divider">
                    <span>Today</span>
                  </div>
                  {messages.map(msg => {
                    const isMine = Number(msg.sender_user_id) === Number(currentUserId);
                    return (
                      <div
                        key={msg.id}
                        className={`message-row ${isMine ? 'mine' : 'theirs'}`}
                      >
                        {!isMine && (
                          <div className="message-avatar">
                            {msg.sender_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`message-bubble-v2 ${isMine ? 'mine' : 'theirs'}`}>
                          <div className="bubble-content-v2">{msg.content}</div>
                          <div className="bubble-time">{formatMessageTime(msg.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="message-composer-v2">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={sending}
                className="message-input-v2"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || sending}
                className="send-button-v2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation-selected-v2">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list to start messaging</p>
          </div>
        )}
      </div>

    </div>
  );
}
