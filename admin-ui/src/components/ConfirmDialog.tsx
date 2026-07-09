import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) => (
  <div className="dialog-overlay" onClick={onCancel}>
    <div className="dialog" onClick={(e) => e.stopPropagation()}>
      <div className={`dialog-icon dialog-icon-${variant}`}>
        {variant === 'danger' ? '🗑️' : '⚠️'}
      </div>
      <div className="dialog-title">{title}</div>
      <div className="dialog-message">{message}</div>
      <div className="dialog-actions">
        <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          className={`btn btn-${variant === 'danger' ? 'danger' : 'secondary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
