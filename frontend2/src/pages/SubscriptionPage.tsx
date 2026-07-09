import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  credits_included: number;
  job_post_limit: number;
  team_member_limit: number;
  is_active: boolean;
}

interface ActiveSubscription {
  id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
  credits_included: number;
  job_post_limit: number;
  team_member_limit: number;
}

interface CreditTransaction {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
}

interface SubscriptionPageProps {
  userRole: string;
}

const PLAN_COLOURS: string[] = ['#e0e7ff', '#d1fae5', '#fef3c7', '#fce7f3'];
const PLAN_ACCENT: string[] = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ userRole }) => {
  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'subscription' | 'credits'>('subscription');
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Credit top-up form (admin only)
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topping, setTopping] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, balRes] = await Promise.all([
        apiClient.getSubscriptionPlans(),
        apiClient.getMySubscription(),
        apiClient.getCreditBalance(),
      ]);
      setPlans(plansRes.data || []);
      setActiveSub(subRes.data);
      setBalance(balRes.data?.balance ?? 0);

      if (isAdmin || isHR) {
        const txnRes = await apiClient.getCreditTransactions();
        setTransactions(txnRes.data || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isHR]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePurchasePlan = async (planId: number) => {
    if (!window.confirm('Purchase this subscription plan?')) return;
    setPurchasing(planId);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.purchaseSubscription({ plan_id: planId, auto_renew: true });
      setSuccess(`Subscribed to plan! ${res.data.credits_granted > 0 ? `+${res.data.credits_granted} credits added.` : ''}`);
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to purchase subscription');
    } finally {
      setPurchasing(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription? You will retain access until the end date.')) return;
    setCancelling(true);
    setError('');
    try {
      await apiClient.cancelSubscription();
      setSuccess('Subscription cancelled');
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount <= 0) { setError('Enter a valid amount'); return; }
    setTopping(true);
    setError('');
    try {
      const res = await apiClient.purchaseCredits({ amount, description: 'Manual top-up' });
      setSuccess(`+${amount} credits added. New balance: ${res.data.new_balance}`);
      setTopUpAmount('');
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to add credits');
    } finally {
      setTopping(false);
    }
  };

  const txnColour = (type: string, amount: number) => {
    if (amount > 0) return { bg: '#f0fdf4', text: '#16a34a' };
    return { bg: '#fef2f2', text: '#dc2626' };
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        Loading subscription data…
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Section toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['subscription', 'credits'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: activeSection === s ? 'none' : '1px solid #e2e8f0',
              background: activeSection === s ? '#6366f1' : '#fff',
              color: activeSection === s ? '#fff' : '#64748b',
              cursor: 'pointer',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#16a34a', fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* ─── Subscription Section ─── */}
      {activeSection === 'subscription' && (
        <div>
          {/* Active subscription card */}
          {activeSub ? (
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 12, padding: '20px 24px', color: '#fff', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Active Plan</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{activeSub.plan_name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                    Renews {new Date(activeSub.end_date).toLocaleDateString()} · {activeSub.auto_renew ? 'Auto-renew on' : 'Auto-renew off'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Team limit</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{activeSub.team_member_limit === 0 ? '∞' : activeSub.team_member_limit}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{activeSub.job_post_limit === 0 ? '∞' : activeSub.job_post_limit}</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>Job Posts</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{activeSub.credits_included}</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>Credits / cycle</div>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    marginTop: 14, padding: '6px 16px', background: 'rgba(255,255,255,0.15)',
                    color: '#fff', border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ margin: 0, fontSize: 14 }}>No active subscription. Choose a plan below.</p>
            </div>
          )}

          {/* Plans grid */}
          {isAdmin && (
            <>
              <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Available Plans</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {plans.map((plan, i) => {
                  const isActive = activeSub?.plan_name === plan.name;
                  const accent = PLAN_ACCENT[i % PLAN_ACCENT.length];
                  const bg = PLAN_COLOURS[i % PLAN_COLOURS.length];
                  return (
                    <div
                      key={plan.id}
                      style={{
                        background: bg, borderRadius: 12, padding: '18px 16px',
                        border: isActive ? `2px solid ${accent}` : '2px solid transparent',
                        position: 'relative',
                      }}
                    >
                      {isActive && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: accent, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                          Current
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>{plan.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>${plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>/mo</span></div>
                      <ul style={{ margin: '10px 0', paddingLeft: 16, fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
                        <li>{plan.job_post_limit === 0 ? 'Unlimited' : plan.job_post_limit} job posts</li>
                        <li>{plan.team_member_limit === 0 ? 'Unlimited' : plan.team_member_limit} team members</li>
                        <li>{plan.credits_included} credits/month</li>
                      </ul>
                      {plan.description && (
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 10px' }}>{plan.description}</p>
                      )}
                      <button
                        onClick={() => handlePurchasePlan(plan.id)}
                        disabled={isActive || purchasing === plan.id}
                        style={{
                          width: '100%', padding: '8px 0', background: isActive ? '#e2e8f0' : accent,
                          color: isActive ? '#94a3b8' : '#fff', border: 'none', borderRadius: 8,
                          fontSize: 13, fontWeight: 600, cursor: isActive ? 'default' : 'pointer',
                        }}
                      >
                        {purchasing === plan.id ? 'Processing…' : isActive ? 'Active' : 'Choose Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Credits Section ─── */}
      {activeSection === 'credits' && (
        <div>
          {/* Balance card */}
          <div style={{
            background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', borderRadius: 12,
            padding: '20px 24px', color: '#fff', marginBottom: 24, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Credit Balance</div>
              <div style={{ fontSize: 36, fontWeight: 800 }}>{balance}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Available credits</div>
            </div>
            <div style={{ fontSize: 48, opacity: 0.6 }}>💎</div>
          </div>

          {/* Top-up form (admin only) */}
          {isAdmin && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Add Credits</h4>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
                In production, credits are added via payment. On localhost, use this form to top up manually.
              </p>
              <form onSubmit={handleTopUp} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                  placeholder="Amount (e.g. 100)"
                  min={1}
                  required
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={topping}
                  style={{
                    padding: '8px 20px', background: '#0ea5e9', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: topping ? 'not-allowed' : 'pointer', opacity: topping ? 0.7 : 1,
                  }}
                >
                  {topping ? 'Adding…' : 'Add Credits'}
                </button>
              </form>
            </div>
          )}

          {/* Transaction history */}
          {(isAdmin || isHR) && (
            <>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                Transaction History
              </h4>
              {transactions.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No transactions yet</p>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  {transactions.map(txn => {
                    const { bg, text } = txnColour(txn.type, txn.amount);
                    return (
                      <div key={txn.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', borderTop: '1px solid #e2e8f0',
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                            {txn.description || txn.type}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {new Date(txn.transaction_date).toLocaleString()}
                          </div>
                        </div>
                        <span style={{
                          background: bg, color: text, padding: '4px 10px',
                          borderRadius: 20, fontSize: 13, fontWeight: 700,
                        }}>
                          {txn.amount > 0 ? '+' : ''}{txn.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
