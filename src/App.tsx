import { useEffect, useState } from 'react';
import SelfServiceShipmentWidget from './SelfServiceShipmentWidget';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowWidget(true);
      setIsExiting(false);
      return;
    }

    if (showWidget) {
      setIsExiting(true);
      const timer = window.setTimeout(() => {
        setShowWidget(false);
        setIsExiting(false);
      }, 180);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, showWidget]);

  return (
    <div className="sssw-app">
      <div className="sssw-entry">
        <div className={`sssw-entry-faq ${isOpen ? 'sssw-entry-faq--open' : ''}`}>
          <div className="sssw-entry-header">
            <div className="sssw-entry-text">
              <p className="sssw-entry-title">Devi modificare alcune informazioni relative al tuo ordine?</p>
              <p className="sssw-entry-subtitle">
                In base allo stato dell'ordine, alcune modifiche possono essere gestite direttamente online.
              </p>
            </div>
            <button
              type="button"
              className="sssw-entry-toggle"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Chiudi la sezione modifiche' : 'Apri la sezione modifiche'}
            >
              <span className="sssw-entry-toggle-icon" aria-hidden="true" />
            </button>
          </div>
          {showWidget && (
            <div className={`sssw-entry-panel ${isExiting ? 'sssw-entry-panel--exit' : 'sssw-entry-panel--enter'}`}>
              <SelfServiceShipmentWidget />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
