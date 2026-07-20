import React from 'react';

export interface DetailDrawerProps {
  /** Called when the backdrop is clicked or the caller otherwise wants to dismiss the drawer. */
  onClose: () => void;
  /** Full drawer content (header + body) — each caller keeps its own markup/classes here. */
  children: React.ReactNode;
  /** Overlay/backdrop className. Defaults to the candidate-dashboard drawer style. */
  overlayClassName?: string;
  /** Drawer/modal container className. Defaults to the candidate-dashboard drawer style. */
  modalClassName?: string;
  /** Optional inline style override for the modal container (e.g. a one-off max-width). */
  modalStyle?: React.CSSProperties;
}

/**
 * Shared overlay + backdrop-click-to-close + click-inside-doesn't-close shell,
 * previously duplicated across ~11 call sites in the candidate and recruiter
 * dashboards (cal-drawer, vp-modal, ra-modal-overlay variants). Visual styling
 * stays per-caller via overlayClassName/modalClassName — this only unifies the
 * open/close mechanics.
 */
const DetailDrawer: React.FC<DetailDrawerProps> = ({
  onClose,
  children,
  overlayClassName = 'cal-drawer-overlay',
  modalClassName = 'cal-drawer',
  modalStyle,
}) => {
  return (
    <div
      className={overlayClassName}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={modalClassName} style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default DetailDrawer;
