import type {
  ConfirmStatus,
  EditableDetails,
  FlowType,
  NewDeliveryAddress,
  DeliveryAddress
} from './types';
import type { SyncStatus } from './api/types';
import ReviewSummary from './ReviewSummary';
import StepHeader from './StepHeader';

type ReviewStepProps = {
  flowType: FlowType;
  editable: EditableDetails;
  reviewAddress?: DeliveryAddress | NewDeliveryAddress;
  confirmStatus: ConfirmStatus;
  isConfirming: boolean;
  syncStatus?: SyncStatus | null;
  syncErrorMessage?: string | null;
  onRetrySync?: () => void;
  onBack?: () => void;
};

export default function ReviewStep({
  flowType,
  editable,
  reviewAddress,
  confirmStatus,
  isConfirming,
  syncStatus,
  syncErrorMessage,
  onRetrySync,
  onBack
}: ReviewStepProps) {
  return (
    <div className="sssw-wizard-body">
      <StepHeader
        title="Rivedi e conferma"
        helper="Controlla i dettagli prima di inviare la richiesta."
        onBack={onBack}
      />

      {confirmStatus === 'idle' && flowType === 'shipping' && (
        <ReviewSummary title="Nuovo indirizzo di consegna">
          {reviewAddress ? (
            <div className="sssw-review-card">
              <span>{reviewAddress.street}</span>
              <span>{`${reviewAddress.city} ${reviewAddress.zip}`}</span>
              <span>{reviewAddress.country}</span>
            </div>
          ) : (
            <p className="sssw-empty">Nessun indirizzo selezionato.</p>
          )}
        </ReviewSummary>
      )}

      {confirmStatus === 'idle' && flowType === 'info' && (
        <ReviewSummary title="Informazioni di contatto">
          <div className="sssw-review-card">
            <span>{editable.contactEmail || '-'}</span>
            <span>{editable.contactPhone || '-'}</span>
          </div>
        </ReviewSummary>
      )}

      {confirmStatus === 'idle' && flowType === 'cancel' && (
        <ReviewSummary title="Richiesta cancellazione">
          <div className="sssw-review-card">
            <span>La richiesta verra' verificata e riceverai un'email di conferma.</span>
          </div>
        </ReviewSummary>
      )}

      {confirmStatus !== 'idle' && (
        <div className="sssw-confirm-state">
          {isConfirming ? (
            <div className="sssw-confirm-loading">
              <div className="sssw-spinner" aria-hidden="true" />
              <p>Stiamo aggiornando i dati...</p>
            </div>
          ) : confirmStatus === 'error' ? (
            <div className="sssw-confirm-success">
              <p className="sssw-confirm-title">Operazione non riuscita</p>
              <p className="sssw-confirm-text">Riprova tra qualche istante.</p>
            </div>
          ) : (
            <div className="sssw-confirm-success">
              <span className="sssw-confirm-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4.3-12.7a1 1 0 0 0-1.4-1.4l-4.1 4.1-1.7-1.7a1 1 0 0 0-1.4 1.4l2.4 2.4a1 1 0 0 0 1.4 0l4.8-4.8Z" />
                </svg>
              </span>
              <p className="sssw-confirm-title">Modifica salvata</p>
              <p className="sssw-confirm-text">Abbiamo registrato la tua richiesta.</p>
              {syncStatus === 'SYNCING' || syncStatus === 'PENDING' ? (
                <p className="sssw-confirm-text">La sincronizzazione e' in corso.</p>
              ) : null}
              {syncStatus === 'FAILED' && onRetrySync ? (
                <>
                  {syncErrorMessage && (
                    <p className="sssw-confirm-text">{syncErrorMessage}</p>
                  )}
                  <button
                    type="button"
                    className="sssw-link-button sssw-link-button--secondary"
                    onClick={onRetrySync}
                  >
                    Riprova sincronizzazione
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
