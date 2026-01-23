import type { ReactNode } from 'react';

type DrawerProps = {
  isOpen: boolean;
  title: string;
  side?: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
};

export default function Drawer({ isOpen, title, side = 'right', onClose, children }: DrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="sssw-drawer-portal" role="dialog" aria-modal="true">
      <button type="button" className="sssw-drawer-scrim" onClick={onClose} aria-label="Chiudi" />
      <div className={`sssw-drawer sssw-drawer--${side}`}>
        <div className="sssw-drawer-header">
          <p className="sssw-drawer-title">{title}</p>
          <button type="button" className="sssw-drawer-close" onClick={onClose}>
            Chiudi
          </button>
        </div>
        <div className="sssw-drawer-body">{children}</div>
      </div>
    </div>
  );
}
