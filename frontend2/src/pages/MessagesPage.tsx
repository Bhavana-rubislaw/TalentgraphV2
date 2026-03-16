/**
 * MessagesPage — full-screen messaging UI
 *
 * Route params
 *   ?c=<conversationId>   — pre-select a conversation on load
 *
 * Renders:
 *   Left panel  — ConversationList
 *   Right panel — ChatThread (or empty state)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import '../styles/MessagesPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherUser {
  id: number | null;
  full_name: string;
  is_online: boolean;
  last_seen_at: string | null;
}

interface Conversation {
  id: number;
  candidate_id: number;
  job_posting_id: number;
  company_id: number;
  candidate_name: string;
  candidate_user_id: number | null;
  recruiter_name: string;
  recruiter_user_id: number | null;
  job_title: string;
  last_message_preview: string;
  last_message_at: string | null;
  unread_count: number;
  other_user: OtherUser;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  sender_name: string;
  sender_role: string;  // 'candidate' | 'recruiter' | 'hr' | 'admin'
  text: string;
  is_read: boolean;
  read_at: string | null;
  status: string;  // 'sent' | 'read'
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) {
    return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}


/** Returns a human-friendly presence label, or null when no data is available. */
function presenceLabel(isOnline: boolean, lastSeenAt: string | null): string | null {
  if (isOnline) return 'Active now';
  if (!lastSeenAt) return null;
  const diff = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
  if (diff < 120) return 'Active recently';
  if (diff < 3600) return `Last seen ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Last seen ${Math.floor(diff / 3600)}h ago`;
  return `Last seen ${Math.floor(diff / 86400)}d ago`;
}

/**
 * Get the other participant's name dynamically based on current user.
 * - If current user is the candidate → returns recruiter name
 * - If current user is the recruiter → returns candidate name
 */
function getOtherParticipantName(conversation: Conversation, currentUserId: number): string {
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[getOtherParticipantName]', {
      conversationId: conversation.id,
      currentUserId,
      candidateUserId: conversation.candidate_user_id,
      recruiterUserId: conversation.recruiter_user_id,
      candidateName: conversation.candidate_name,
      recruiterName: conversation.recruiter_name,
      otherUserFullName: conversation.other_user?.full_name,
    });
  }

  // Use the pre-computed other_user from backend (most reliable)
  if (conversation.other_user?.full_name && conversation.other_user.full_name !== 'Unknown') {
    console.log('[getOtherParticipantName] Using other_user.full_name:', conversation.other_user.full_name);
    return conversation.other_user.full_name;
  }
  
  // Fallback: manually determine based on user IDs
  // Check which participant the current user is NOT
  if (conversation.candidate_user_id && currentUserId === conversation.candidate_user_id) {
    // Current user is the candidate → show recruiter
    console.log('[getOtherParticipantName] Current user is candidate, showing recruiter:', conversation.recruiter_name);
    return conversation.recruiter_name || 'Recruiter';
  } else if (conversation.recruiter_user_id && currentUserId === conversation.recruiter_user_id) {
    // Current user is the recruiter → show candidate
    console.log('[getOtherParticipantName] Current user is recruiter, showing candidate:', conversation.candidate_name);
    return conversation.candidate_name || 'Candidate';
  }
  
  // Additional fallback: if IDs don't match, determine by checking which name isn't the current user's
  // This handles cases where user_id relationships might be missing
  const currentUserName = localStorage.getItem('full_name') || '';
  if (conversation.candidate_name && conversation.candidate_name !== currentUserName) {
    console.log('[getOtherParticipantName] Using candidate_name (name mismatch):', conversation.candidate_name);
    return conversation.candidate_name;
  }
  if (conversation.recruiter_name && conversation.recruiter_name !== currentUserName) {
    console.log('[getOtherParticipantName] Using recruiter_name (name mismatch):', conversation.recruiter_name);
    return conversation.recruiter_name;
  }
  
  // Ultimate fallback
  console.warn('[getOtherParticipantName] Could not determine other participant, using Unknown');
  return 'Unknown';
}

/**
 * Check if a message is from the current user (for bubble ownership).
 * Uses strict number comparison with explicit coercion to avoid type mismatches.
 */
function isOwnMessage(message: Message, currentUserId: number): boolean {
  const senderUserId = Number(message.sender_user_id);
  const currentUserIdNum = Number(currentUserId);
  const result = senderUserId === currentUserIdNum;
  
  // Debug log (remove after verification)
  if (import.meta.env.DEV) {
    console.log('Message ownership check:', {
      senderUserId,
      currentUserIdNum,
      senderName: message.sender_name,
      text: message.text.substring(0, 20),
      isMine: result,
    });
  }
  
  return result;
}

// ─── Read Receipt Tick Icon ───────────────────────────────────────────────────

const ReadReceiptIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'read') {
    // Double tick (filled/blue) — Read
    return (
      <svg
        className="receipt-icon receipt-icon--read"
        viewBox="0 0 16 11"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Read"
      >
        <path d="M1 5.5L5.5 10L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 5.5L9.5 10L19 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  // Single tick — Sent
  return (
    <svg
      className="receipt-icon receipt-icon--sent"
      viewBox="0 0 16 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sent"
    >
      <path d="M1 5.5L5.5 10L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// ─── ConversationList ─────────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (conv: Conversation) => void;
  loading: boolean;
  currentUserId: number;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  loading,
  currentUserId,
}) => {
  if (loading) {
    return (
      <div className="conv-list-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="conv-skeleton">
            <div className="skel-avatar" />
            <div className="skel-lines">
              <div className="skel-line skel-line--name" />
              <div className="skel-line skel-line--preview" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="conv-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p>No conversations yet</p>
      </div>
    );
  }

  return (
    <ul className="conv-list" role="listbox" aria-label="Conversations">
      {conversations.map((conv) => {
        const otherParticipantName = getOtherParticipantName(conv, currentUserId);
        return (
          <li
            key={conv.id}
            role="option"
            aria-selected={conv.id === selectedId}
            className={`conv-item${conv.id === selectedId ? ' conv-item--active' : ''}${conv.unread_count > 0 ? ' conv-item--unread' : ''}`}
            onClick={() => onSelect(conv)}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(conv)}
          >
            <div className="conv-avatar-wrap">
              <div className="conv-avatar">
                {otherParticipantName.charAt(0).toUpperCase()}
              </div>
              {conv.other_user.is_online && (
                <span
                  className="presence-dot presence-dot--online"
                  title="Active now"
                />
              )}
            </div>
            <div className="conv-info">
              <div className="conv-row-top">
                <span className="conv-name">{otherParticipantName}</span>
                {conv.last_message_at && (
                  <span className="conv-time">{formatTime(conv.last_message_at)}</span>
                )}
              </div>
              <div className="conv-row-sub">
                <span className="conv-job">{conv.job_title}</span>
              </div>
              <div className="conv-row-preview">
                <span className="conv-preview">{conv.last_message_preview || 'No messages yet'}</span>
                {conv.unread_count > 0 && (
                  <span className="conv-badge" aria-label={`${conv.unread_count} unread`}>
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

// ─── ChatThread ───────────────────────────────────────────────────────────────

interface ChatThreadProps {
  conversation: Conversation;
  messages: Message[];
  loadingMsgs: boolean;
  onSend: (text: string) => Promise<void>;
  onLoadMore: () => void;
  hasMore: boolean;
  currentUserId: number;
  currentUserRole: string;
  onMarkRead: (convId: number) => Promise<void>;
}

const ChatThread: React.FC<ChatThreadProps> = ({
  conversation,
  messages,
  loadingMsgs,
  onSend,
  onLoadMore,
  hasMore,
  currentUserId,
  onMarkRead,
}) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark incoming messages as read when the thread is opened / messages change
  useEffect(() => {
    const hasUnread = messages.some(
      (m) => Number(m.sender_user_id) !== Number(currentUserId) && !m.is_read
    );
    if (hasUnread) {
      onMarkRead(conversation.id).catch(() => {/* non-critical */});
    }
  }, [messages, conversation.id, currentUserId, onMarkRead]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    setDraft('');
    try {
      await onSend(text);
    } catch (err: any) {
      // Provide helpful error messages based on the error type
      let errorMessage = 'Failed to send message';
      
      if (err?.response?.status === 401) {
        errorMessage = 'Your session has expired. Please refresh the page and log in again.';
      } else if (err?.response?.status === 403) {
        errorMessage = 'You do not have permission to send messages in this conversation.';
      } else if (err?.response?.status === 404) {
        errorMessage = 'Conversation not found. Please refresh the page.';
      } else if (!err?.response) {
        // Network error - no response received
        errorMessage = 'Cannot connect to server. Please check your connection and try again.';
      } else if (err?.response?.data?.detail) {
        // Use backend error message if available
        errorMessage = err.response.data.detail;
      }
      
      setSendError(errorMessage);
      setDraft(text); // restore draft so user can retry
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const presence = presenceLabel(
    conversation.other_user.is_online,
    conversation.other_user.last_seen_at,
  );

  // Group consecutive messages by sender for visual grouping
  const groupedMessages = messages.map((msg, idx) => {
    const prevMsg = messages[idx - 1];
    const nextMsg = messages[idx + 1];
    // Use helper function for ownership (with type-safe comparison)
    const isMine = isOwnMessage(msg, currentUserId);
    // Group detection uses same IDs
    const isFirstInGroup = !prevMsg || Number(prevMsg.sender_user_id) !== Number(msg.sender_user_id);
    const isLastInGroup = !nextMsg || Number(nextMsg.sender_user_id) !== Number(msg.sender_user_id);
    return { msg, isMine, isFirstInGroup, isLastInGroup };
  });

  // Get the other participant's name for the header
  const otherParticipantName = getOtherParticipantName(conversation, currentUserId);

  return (
    <div className="chat-thread">
      {/* Thread header */}
      <div className="thread-header">
        <div className="thread-avatar">
          {otherParticipantName.charAt(0).toUpperCase()}
        </div>
        <div className="thread-header-info">
          <div className="thread-header-name">{otherParticipantName}</div>
          <div className="thread-header-meta">
            {conversation.job_title}
            {presence && (
              <span className="thread-presence">
                <span
                  className={`presence-dot${conversation.other_user.is_online ? ' presence-dot--online' : ''}`}
                />
                {presence}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="thread-messages" ref={threadRef} aria-live="polite">
        {hasMore && (
          <button className="load-more-btn" onClick={onLoadMore} disabled={loadingMsgs}>
            {loadingMsgs ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}
        {loadingMsgs && messages.length === 0 && (
          <div className="thread-loading">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        )}

        {groupedMessages.map(({ msg, isMine, isFirstInGroup, isLastInGroup }) => (
          <div
            key={msg.id}
            className={[
              'msg-row',
              isMine ? 'msg-row--mine' : 'msg-row--theirs',
              isFirstInGroup ? 'msg-row--first-in-group' : '',
              isLastInGroup ? 'msg-row--last-in-group' : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Avatar: only for other-user messages, only on last bubble in group */}
            {!isMine && (
              <div
                className={`msg-avatar-sm${isLastInGroup ? '' : ' msg-avatar-sm--hidden'}`}
                aria-hidden="true"
              >
                {isLastInGroup ? msg.sender_name.charAt(0).toUpperCase() : ''}
              </div>
            )}

            <div className="msg-col">
              {/* Sender name: only for incoming, only on first in group */}
              {!isMine && isFirstInGroup && (
                <div className="msg-sender-name">{msg.sender_name}</div>
              )}

              {/* Bubble */}
              <div
                className={[
                  'msg-bubble',
                  isMine ? 'msg-bubble--mine' : 'msg-bubble--theirs',
                  isFirstInGroup ? 'msg-bubble--first' : '',
                  isLastInGroup ? 'msg-bubble--last' : '',
                ].filter(Boolean).join(' ')}
              >
                {msg.text}
              </div>

              {/* Metadata: timestamp + status (only on last bubble in group) */}
              {isLastInGroup && (
                <div className={`msg-meta${isMine ? ' msg-meta--mine' : ' msg-meta--theirs'}`}>
                  <span className="msg-time">
                    {formatTime(msg.created_at)}
                  </span>
                  {isMine && (
                    <span className="msg-status">
                      <ReadReceiptIcon status={msg.status} />
                      <span className="msg-status-label">
                        {msg.status === 'read' ? 'Read' : 'Sent'}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="thread-compose">
        {sendError && (
          <div className="compose-error" role="alert">
            {sendError}
            <button
              className="compose-error-dismiss"
              onClick={() => setSendError(null)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
        <div className="compose-row">
          <textarea
            className="compose-input"
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={4000}
            aria-label="Message input"
          />
          <button
            className="compose-send-btn"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            aria-label="Send message"
          >
            {sending ? (
              <span className="spinner-sm" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MessagesPage (main) ──────────────────────────────────────────────────────

interface MessagesPageProps {
  userRole?: string;
}

const MessagesPage: React.FC<MessagesPageProps> = (_props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Resolve current user ID from AuthContext with localStorage fallback
  // Always ensure it's a proper number to avoid type comparison issues
  const currentUserId: number = Number(
    user?.user_id ?? parseInt(localStorage.getItem('user_id') || '0', 10)
  );
  const currentUserRole: string =
    (user?.role ?? localStorage.getItem('role') ?? '').toLowerCase().trim();
  
  // Debug: Log current user info on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('MessagesPage: Current user:', {
        currentUserId,
        currentUserRole,
        fromAuth: !!user?.user_id,
      });
    }
  }, [currentUserId, currentUserRole, user]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Mark conversation as read (used by ChatThread) ────────────────────────
  const handleMarkRead = useCallback(async (convId: number) => {
    await apiClient.markConversationRead(convId);
    // Update local message statuses to 'read' for incoming messages
    setMessages((prev) =>
      prev.map((m) =>
        Number(m.sender_user_id) !== Number(currentUserId) && !m.is_read
          ? { ...m, is_read: true, status: 'read' }
          : m
      )
    );
    // Zero out unread badge on the conversation
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  }, [currentUserId]);

  // ── Load messages for a conversation ─────────────────────────────────────
  const loadMessages = useCallback(
    async (convId: number, before?: number) => {
      setLoadingMsgs(true);
      try {
        const res = await apiClient.getMessages(convId, { limit: 50, before });
        const newMsgs: Message[] = res.data;
        if (before !== undefined) {
          // Prepend older messages
          setMessages((prev) => [...newMsgs, ...prev]);
        } else {
          setMessages(newMsgs);
        }
        setHasMore(newMsgs.length === 50);
      } catch (err: any) {
        let errorMessage = 'Failed to load messages';
        
        if (err?.response?.status === 401) {
          errorMessage = 'Your session has expired. Please refresh the page and log in again.';
        } else if (!err?.response) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else if (err?.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        }
        
        setError(errorMessage);
      } finally {
        setLoadingMsgs(false);
      }
    },
    []
  );

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    setError(null);
    try {
      const res = await apiClient.getConversations();
      const convs: Conversation[] = res.data;
      setConversations(convs);

      const cParam = searchParams.get('c');
      if (cParam) {
        const found = convs.find((c) => c.id === parseInt(cParam, 10));
        if (found) {
          setSelectedConv(found);
          await loadMessages(found.id);
          try {
            await apiClient.markConversationRead(found.id);
            setConversations((prev) =>
              prev.map((c) => (c.id === found.id ? { ...c, unread_count: 0 } : c))
            );
          } catch { /* non-critical */ }
        }
      } else if (convs.length > 0 && !selectedConv) {
        const latest = convs[0];
        setSelectedConv(latest);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('c', String(latest.id));
          return next;
        }, { replace: true });
        await loadMessages(latest.id);
        try {
          await apiClient.markConversationRead(latest.id);
          setConversations((prev) =>
            prev.map((c) => (c.id === latest.id ? { ...c, unread_count: 0 } : c))
          );
        } catch { /* non-critical */ }
      }
    } catch (err: any) {
      let errorMessage = 'Failed to load conversations';
      
      if (err?.response?.status === 401) {
        errorMessage = 'Your session has expired. Please refresh the page and log in again.';
      } else if (!err?.response) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoadingConvs(false);
    }
  }, [searchParams, selectedConv, setSearchParams, loadMessages]);

  useEffect(() => {
    loadConversations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Conversation selection ────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    async (conv: Conversation) => {
      setSelectedConv(conv);
      setMessages([]);
      setHasMore(false);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('c', String(conv.id));
        return next;
      }, { replace: true });
      await loadMessages(conv.id);
      // Mark as read when opening — ChatThread will also fire, but this handles
      // the initial open before messages render.
      try {
        await apiClient.markConversationRead(conv.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
      } catch { /* non-critical */ }
    },
    [loadMessages, setSearchParams]
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      if (!selectedConv) return;
      const res = await apiClient.sendMessage(selectedConv.id, text);
      const newMsg: Message = res.data;
      setMessages((prev) => [...prev, newMsg]);
      setError(null);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id
            ? { ...c, last_message_preview: text.slice(0, 80), last_message_at: newMsg.created_at }
            : c
        )
      );
    },
    [selectedConv]
  );

  // ── Load more (pagination) ────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (!selectedConv || messages.length === 0) return;
    loadMessages(selectedConv.id, messages[0].id);
  }, [selectedConv, messages, loadMessages]);

  // ── Polling: refresh conversations + messages every 10s ──────────────────
  useEffect(() => {
    const tick = async () => {
      try {
        const res = await apiClient.getConversations();
        setConversations(res.data);
      } catch { /* silent */ }

      if (selectedConv) {
        try {
          const res = await apiClient.getMessages(selectedConv.id, { limit: 50 });
          const newMsgs: Message[] = res.data;
          setMessages(newMsgs);

          // Update own message statuses from poll (read receipts update)
          // Already handled by setMessages above since full list is replaced.
        } catch { /* silent */ }
      }
    };

    pollRef.current = setInterval(tick, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedConv]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="messages-page">
      {/* Left panel */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2 className="messages-title">Messages</h2>
          <button
            className="messages-refresh-btn"
            onClick={loadConversations}
            title="Refresh conversations"
            aria-label="Refresh"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
        {error && <div className="messages-error">{error}</div>}
        <ConversationList
          conversations={conversations}
          selectedId={selectedConv?.id ?? null}
          onSelect={handleSelectConversation}
          loading={loadingConvs}
          currentUserId={currentUserId}
        />
      </div>

      {/* Right panel */}
      <div className="messages-main">
        {selectedConv ? (
          <ChatThread
            conversation={selectedConv}
            messages={messages}
            loadingMsgs={loadingMsgs}
            onSend={handleSend}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onMarkRead={handleMarkRead}
          />
        ) : (
          <div className="messages-empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
