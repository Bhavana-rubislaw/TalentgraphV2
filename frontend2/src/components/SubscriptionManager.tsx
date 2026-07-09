import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import '../styles/SubscriptionManager.css';

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  credits_included: number;
  job_post_limit: number;
  team_member_limit: number;
}

interface CompanySubscription {
  id: number;
  company_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  status: string;
  plan: SubscriptionPlan;
}

const SubscriptionManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CompanySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await apiClient.getSubscriptionPlans();
      setPlans(response);
    } catch (err) {
      setError('Failed to load subscription plans');
      console.error(err);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const subscription = await apiClient.getCompanySubscription();
      setCurrentSubscription(subscription);
    } catch (err) {
      // No current subscription
      setCurrentSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSubscription = async (planId: number) => {
    try {
      setLoading(true);
      await apiClient.purchaseSubscription(planId);
      alert('Subscription purchased successfully!');
      fetchCurrentSubscription();
      fetchPlans();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to purchase subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.cancelSubscription();
      alert('Subscription cancelled successfully');
      fetchCurrentSubscription();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="subscription-manager loading">Loading subscription information...</div>;
  }

  return (
    <div className="subscription-manager">
      <h2>Subscription Management</h2>

      {error && <div className="error-message">{error}</div>}

      {currentSubscription && (
        <div className="current-subscription">
          <h3>Current Subscription</h3>
          <div className="subscription-details">
            <p><strong>Plan:</strong> {currentSubscription.plan.name}</p>
            <p><strong>Status:</strong> {currentSubscription.status}</p>
            <p><strong>Valid Until:</strong> {new Date(currentSubscription.end_date).toLocaleDateString()}</p>
            <p><strong>Credits Included:</strong> {currentSubscription.plan.credits_included}</p>
            <p><strong>Job Post Limit:</strong> {currentSubscription.plan.job_post_limit === 0 ? 'Unlimited' : currentSubscription.plan.job_post_limit}</p>
            <p><strong>Team Members Allowed:</strong> {currentSubscription.plan.team_member_limit}</p>
          </div>
          <button className="btn-cancel" onClick={handleCancelSubscription}>
            Cancel Subscription
          </button>
        </div>
      )}

      {!currentSubscription && (
        <div className="no-subscription">
          <p>You don't have an active subscription. Choose a plan below to get started.</p>
        </div>
      )}

      <div className="plans-grid">
        <h3>Available Plans</h3>
        {plans.map((plan) => (
          <div key={plan.id} className="plan-card">
            <h4>{plan.name}</h4>
            {plan.description && <p className="description">{plan.description}</p>}
            <div className="price">
              <span className="amount">${plan.price}</span>
              <span className="currency">{plan.currency}/month</span>
            </div>
            <ul className="features">
              <li>✓ {plan.credits_included} Credits</li>
              <li>✓ {plan.job_post_limit === 0 ? 'Unlimited' : plan.job_post_limit} Job Posts</li>
              <li>✓ {plan.team_member_limit} Team Members</li>
            </ul>
            <button
              className="btn-subscribe"
              onClick={() => handlePurchaseSubscription(plan.id)}
              disabled={currentSubscription?.plan_id === plan.id || loading}
            >
              {currentSubscription?.plan_id === plan.id ? 'Current Plan' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionManager;
