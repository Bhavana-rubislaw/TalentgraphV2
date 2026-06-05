import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import '../styles/CreditManager.css';

interface CreditBalance {
  current_credits: number;
  plan_id?: number;
  plan_name?: string;
  credits_included?: number;
  subscription_status?: string;
}

interface CreditTransaction {
  id: number;
  company_id: number;
  type: string;
  amount: number;
  description?: string;
  transaction_date: string;
}

const CreditManager: React.FC = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState(100);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  useEffect(() => {
    fetchCreditBalance();
    fetchTransactions();
  }, []);

  const fetchCreditBalance = async () => {
    try {
      const data = await apiClient.getCreditBalance();
      setBalance(data);
    } catch (err) {
      setError('Failed to load credit balance');
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await apiClient.getCreditTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiClient.purchaseCredits(purchaseAmount);
      alert('Credits purchased successfully!');
      setPurchaseAmount(100);
      setShowPurchaseForm(false);
      fetchCreditBalance();
      fetchTransactions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to purchase credits');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !balance) {
    return <div className="credit-manager loading">Loading credit information...</div>;
  }

  return (
    <div className="credit-manager">
      <h2>Credit Management</h2>

      {error && <div className="error-message">{error}</div>}

      {balance && (
        <div className="credit-balance-card">
          <div className="balance-display">
            <h3>Current Balance</h3>
            <div className="balance-amount">{balance.current_credits}</div>
            <p className="balance-label">Credits Available</p>
          </div>

          {balance.plan_name && (
            <div className="plan-info">
              <p><strong>Current Plan:</strong> {balance.plan_name}</p>
              <p><strong>Plan Credits:</strong> {balance.credits_included}</p>
              <p><strong>Status:</strong> {balance.subscription_status}</p>
            </div>
          )}

          <button
            className="btn-purchase"
            onClick={() => setShowPurchaseForm(!showPurchaseForm)}
          >
            {showPurchaseForm ? 'Cancel' : '+ Purchase Credits'}
          </button>
        </div>
      )}

      {showPurchaseForm && (
        <form className="purchase-form" onSubmit={handlePurchaseCredits}>
          <h4>Purchase Additional Credits</h4>
          <div className="form-group">
            <label htmlFor="amount">Number of Credits</label>
            <input
              id="amount"
              type="number"
              min="1"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(parseInt(e.target.value))}
              required
            />
          </div>
          <div className="price-estimate">
            <p>Estimated Cost: ${(purchaseAmount * 0.01).toFixed(2)}</p>
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            Purchase Credits
          </button>
        </form>
      )}

      <div className="transactions-section">
        <h3>Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="no-transactions">No transactions yet</p>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className={`type-${transaction.type}`}>
                  <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${transaction.type}`}>
                      {transaction.type.toUpperCase()}
                    </span>
                  </td>
                  <td className={transaction.amount > 0 ? 'positive' : 'negative'}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </td>
                  <td>{transaction.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CreditManager;
