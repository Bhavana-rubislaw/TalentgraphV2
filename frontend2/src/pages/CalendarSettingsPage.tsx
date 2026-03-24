import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { CalendarAccount, VideoProviderAccount } from '../types/meeting';

export const CalendarSettingsPage: React.FC = () => {
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);
  const [videoProviders, setVideoProviders] = useState<VideoProviderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video provider form states
  const [showZoomForm, setShowZoomForm] = useState(false);
  const [zoomApiKey, setZoomApiKey] = useState('');
  const [zoomApiSecret, setZoomApiSecret] = useState('');
  const [autoGenerateLinks, setAutoGenerateLinks] = useState(true);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const [calendarResponse, videoResponse] = await Promise.all([
        apiClient.getCalendarAccounts(),
        apiClient.getVideoProviderAccounts()
      ]);
      setCalendarAccounts(calendarResponse.data || []);
      setVideoProviders(videoResponse.data || []);
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

  const handleCreateZoomAccount = async () => {
    if (!zoomApiKey || !zoomApiSecret) {
      alert('Please provide API Key and Secret');
      return;
    }

    try {
      await apiClient.createVideoProviderAccount({
        provider: 'zoom',
        api_key: zoomApiKey,
        api_secret: zoomApiSecret,
        auto_generate_links: autoGenerateLinks,
        waiting_room_enabled: waitingRoomEnabled
      });
      
      setShowZoomForm(false);
      setZoomApiKey('');
      setZoomApiSecret('');
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add Zoom account');
    }
  };

  const handleDeleteVideoProvider = async (accountId: number) => {
    if (!confirm('Are you sure you want to remove this video provider?')) return;
    
    try {
      await apiClient.deleteVideoProviderAccount(accountId);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove video provider');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '📅';
      case 'microsoft':
        return '📆';
      case 'zoom':
        return '🎥';
      case 'microsoft_teams':
        return '👥';
      case 'google_meet':
        return '📹';
      default:
        return '⚙️';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: '#667eea' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            fontWeight: '600'
          }}>⚙️ Calendar & Video Settings</h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '16px'
          }}>
            Connect your calendars and configure video meeting providers
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
            fontWeight: '600'
          }}>📅 Calendar Connections</h2>

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
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              📅 Connect Google Calendar
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
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              📆 Connect Microsoft Calendar
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
                        <span style={{ fontSize: '24px' }}>
                          {getProviderIcon(account.provider)}
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
                            cursor: 'pointer'
                          }}
                        >
                          {account.sync_enabled ? '✓ Sync Enabled' : '✗ Sync Disabled'}
                        </button>

                        {!account.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(account.id)}
                            style={{
                              padding: '8px 16px',
                              background: 'white',
                              color: '#667eea',
                              border: '1px solid #667eea',
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

        {/* Video Provider Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            color: '#1f2937',
            fontWeight: '600'
          }}>🎥 Video Meeting Providers</h2>

          {/* Add Zoom Button */}
          {!videoProviders.some(vp => vp.provider === 'zoom') && !showZoomForm && (
            <button
              onClick={() => setShowZoomForm(true)}
              style={{
                padding: '12px 24px',
                background: '#2D8CFF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              🎥 Add Zoom Integration
            </button>
          )}

          {/* Zoom Config Form */}
          {showZoomForm && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              background: '#f9fafb'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1f2937' }}>
                Configure Zoom Integration
              </h3>

              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  API Key
                </label>
                <input
                  type="text"
                  value={zoomApiKey}
                  onChange={(e) => setZoomApiKey(e.target.value)}
                  placeholder="Your Zoom API Key"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  API Secret
                </label>
                <input
                  type="password"
                  value={zoomApiSecret}
                  onChange={(e) => setZoomApiSecret(e.target.value)}
                  placeholder="Your Zoom API Secret"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={autoGenerateLinks}
                    onChange={(e) => setAutoGenerateLinks(e.target.checked)}
                  />
                  Auto-generate Zoom links for meetings
                </label>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={waitingRoomEnabled}
                    onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
                  />
                  Enable waiting room by default
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCreateZoomAccount}
                  style={{
                    padding: '10px 20px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Save Zoom Config
                </button>

                <button
                  onClick={() => {
                    setShowZoomForm(false);
                    setZoomApiKey('');
                    setZoomApiSecret('');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'white',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>

              <p style={{
                marginTop: '15px',
                fontSize: '13px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                Get your API credentials from the{' '}
                <a
                  href="https://marketplace.zoom.us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#667eea', textDecoration: 'underline' }}
                >
                  Zoom App Marketplace
                </a>
              </p>
            </div>
          )}

          {/* Video Provider List */}
          {videoProviders.length === 0 && !showZoomForm ? (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
              No video providers configured. Add Zoom to auto-generate meeting links.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {videoProviders.map(provider => (
                <div
                  key={provider.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    background: 'white'
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
                        <span style={{ fontSize: '24px' }}>
                          {getProviderIcon(provider.provider)}
                        </span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937',
                          textTransform: 'capitalize'
                        }}>
                          {provider.provider.replace('_', ' ')}
                        </span>
                      </div>

                      <div style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        marginBottom: '12px'
                      }}>
                        <div>Auto-generate links: {provider.auto_generate_links ? '✓ Yes' : '✗ No'}</div>
                        {provider.provider === 'zoom' && (
                          <div>Waiting room: {provider.waiting_room_enabled ? '✓ Enabled' : '✗ Disabled'}</div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteVideoProvider(provider.id)}
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
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
