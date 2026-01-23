import { useState } from 'react';
import SelfServiceShipmentWidget from './SelfServiceShipmentWidget';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

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
              {isOpen && (
                <p className="sssw-entry-helper">
                  Puoi aggiornare alcuni dati in autonomia senza contattare il supporto.{' '}
                  <button
                    type="button"
                    className="sssw-entry-link"
                    onClick={() => {
                      setProgressValue(0);
                      setIsModalOpen(true);
                    }}
                  >
                    Apri la modalita' guidata
                  </button>
                </p>
              )}
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
        </div>
      </div>
      {isModalOpen && (
        <div
          className="sssw-modal-portal"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsModalOpen(false)}
        >
          <button type="button" className="sssw-modal-scrim" aria-label="Chiudi" />
          <div className="sssw-modal" onClick={(event) => event.stopPropagation()}>
            <div className="sssw-modal-progress">
              <div
                className="sssw-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressValue * 100)}
              >
                <span className="sssw-progress-track">
                  <span className="sssw-progress-fill" style={{ width: `${progressValue * 100}%` }} />
                </span>
              </div>
            </div>
            <div className="sssw-modal-header">
              <p className="sssw-modal-title">Gestione ordine</p>
              <button type="button" className="sssw-modal-close" onClick={() => setIsModalOpen(false)}>
                Chiudi
              </button>
            </div>
            <SelfServiceShipmentWidget onProgressChange={setProgressValue} />
          </div>
        </div>
      )}
    </div>
  );
}
