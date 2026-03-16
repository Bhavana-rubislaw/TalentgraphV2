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
import MeetingScheduler from '../MeetingScheduler';
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
  const [showScheduler, setShowScheduler] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.user_id || 0;

  // ─── Load Conversations ───────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.getDirectConversations();
      setConversations(res.data);
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
      setMessages(res.data);
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
      setMessages(prev => [...prev, res.data]);
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

  // ─── Polling ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Refresh conversations every 5 seconds
    // Using refs to avoid recreating interval on every render
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

  // ─── Get Selected Conversation ───────────────────────────────────────────────

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="chat-window">
      {/* Left Panel: Conversation List */}
      <div className="conversations-panel">
        <div className="conversations-header">
          <h2>Messages</h2>
        </div>
        
        {error && (
          <div className="error-banner">{error}</div>
        )}
        
        {loadingConvs ? (
          <div className="loading-state">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
            <small>Conversations will appear here when started</small>
          </div>
        ) : (
          <div className="conversations-list">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConvId === conv.id ? 'active' : ''}`}
                onClick={() => selectConversation(conv.id)}
              >
                <div className="conv-avatar">
                  {conv.other_user_name.charAt(0).toUpperCase()}
                </div>
                <div className="conv-details">
                  <div className="conv-header-row">
                    <span className="conv-name">{conv.other_user_name}</span>
                    {conv.last_message_at && (
                      <span className="conv-time">{formatTime(conv.last_message_at)}</span>
                    )}
                  </div>
                  <div className="conv-preview-row">
                    <span className="conv-preview">{conv.last_message_preview || 'No messages yet'}</span>
                    {conv.unread_count > 0 && (
                      <span className="unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel: Active Thread */}
      <div className="chat-panel">
        {selectedConv ? (
          <>
            {/* Thread Header */}
            <div className="chat-header">
              <div className="chat-header-avatar">
                {selectedConv.other_user_name.charAt(0).toUpperCase()}
              </div>
              <div className="chat-header-info">
                <h3>{selectedConv.other_user_name}</h3>
              </div>
              {user?.role === 'recruiter' && (
                <button
                  onClick={() => setShowScheduler(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '9px 16px',
                    borderRadius: '11px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(109,40,217,0.35)',
                    transition: 'all 0.2s ease',
                    marginLeft: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(109,40,217,0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(109,40,217,0.35)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Schedule Interview
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="messages-container">
              {loadingMsgs ? (
                <div className="loading-state">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="empty-state">
                  <p>No messages yet</p>
                  <small>Start the conversation!</small>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map(msg => {
                    const isMine = Number(msg.sender_user_id) === Number(currentUserId);
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}
                      >
                        <div className="bubble-content">{msg.content}</div>
                        <div className="bubble-meta">
                          {formatMessageTime(msg.created_at)}
                          {isMine && (
                            <span className="read-status">
                              {' · '}{msg.is_read ? 'Read' : 'Sent'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="message-composer">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || sending}
                className="send-button"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation-selected">
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list to start messaging</p>
          </div>
        )}
      </div>

      {/* Meeting Scheduler Modal */}
      {showScheduler && selectedConv && (
        <MeetingScheduler
          candidateName={selectedConv.other_user_name}
          onClose={() => setShowScheduler(false)}
        />
      )}
    </div>
  );
}
