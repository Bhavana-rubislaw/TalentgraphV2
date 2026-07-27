import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { CalendarAccount } from '../types/meeting';

export const CalendarSettingsPage: React.FC = () => {
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const calendarResponse = await apiClient.getCalendarAccounts();
      setCalendarAccounts(calendarResponse.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await apiClient.initiateGoogleCalendarAuth();
      const authUrl = response.data.authorization_url;
      // Open OAuth flow in new window
      window.open(authUrl, '_blank', 'width=600,height=800');
      // Reload accounts after a delay (user will complete OAuth)
      setTimeout(() => loadAccounts(), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initiate Google auth');
    }
  };

  const handleConnectMicrosoft = async () => {
    try {
      const response = await apiClient.initiateMicrosoftCalendarAuth();
      const authUrl = response.data.authorization_url;
      window.open(authUrl, '_blank', 'width=600,height=800');
      setTimeout(() => loadAccounts(), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initiate Microsoft auth');
    }
  };

  const handleToggleSync = async (accountId: number, currentlyEnabled: boolean) => {
    try {
      await apiClient.toggleCalendarSync(accountId, !currentlyEnabled);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle sync');
    }
  };

  const handleSetPrimary = async (accountId: number) => {
    try {
      await apiClient.setPrimaryCalendar(accountId);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set primary calendar');
    }
  };

  const handleDisconnectCalendar = async (accountId: number) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) return;
    
    try {
      await apiClient.disconnectCalendar(accountId);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to disconnect calendar');
    }
  };

  const ProviderIcon = ({ provider }: { provider: string }) => {
    switch (provider) {
      case 'google':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" width="24" height="24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth="2" width="24" height="24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" width="24" height="24">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: '#3b82f6' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '28px',
            color: '#1f2937',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" width="26" height="26">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
            </svg>
            Calendar Settings
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '16px'
          }}>
            Connect your calendars to sync interviews automatically
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        {/* Calendar Accounts Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            color: '#1f2937',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2" width="20" height="20">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Calendar Connections
          </h2>

          {/* Connect Buttons */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '30px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleConnectGoogle}
              style={{
                padding: '12px 24px',
                background: '#4285F4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Connect Google Calendar
            </button>

            <button
              onClick={handleConnectMicrosoft}
              style={{
                padding: '12px 24px',
                background: '#0078D4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Connect Microsoft Calendar
            </button>
          </div>

          {/* Connected Calendars List */}
          {calendarAccounts.length === 0 ? (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
              No calendars connected. Connect a calendar to enable automatic event syncing.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {calendarAccounts.map(account => (
                <div
                  key={account.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    background: account.is_primary ? '#f0fdf4' : 'white'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ display: 'flex' }}>
                          <ProviderIcon provider={account.provider} />
                        </span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937',
                          textTransform: 'capitalize'
                        }}>
                          {account.provider} Calendar
                        </span>
                        {account.is_primary && (
                          <span style={{
                            padding: '4px 12px',
                            background: '#10b981',
                            color: 'white',
                            fontSize: '12px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}>
                            PRIMARY
                          </span>
                        )}
                      </div>

                      <p style={{
                        margin: '0 0 12px 0',
                        color: '#6b7280',
                        fontSize: '14px'
                      }}>
                        {account.provider_email}
                      </p>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleToggleSync(account.id, account.sync_enabled)}
                          style={{
                            padding: '8px 16px',
                            background: account.sync_enabled ? '#10b981' : '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            {account.sync_enabled ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                          </svg>
                          {account.sync_enabled ? 'Sync Enabled' : 'Sync Disabled'}
                        </button>

                        {!account.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(account.id)}
                            style={{
                              padding: '8px 16px',
                              background: 'white',
                              color: '#3b82f6',
                              border: '1px solid #3b82f6',
                              borderRadius: '6px',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            Set as Primary
                          </button>
                        )}

                        <button
                          onClick={() => handleDisconnectCalendar(account.id)}
                          style={{
                            padding: '8px 16px',
                            background: 'white',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Meeting Links info */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 12px 0',
            fontSize: '20px',
            color: '#1f2937',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2" width="20" height="20">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Video Meeting Links
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
            Zoom links are generated automatically for every interview — there's nothing to configure here.
            When scheduling a meeting, choose "Auto-generate Zoom link" to have one created for you,
            or "I'll provide my own link" to paste a link from Zoom, Teams, or Meet instead.
          </p>
        </div>
      </div>
    </div>
  );
};
