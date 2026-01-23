import type { DeliveryAddress, NewDeliveryAddress } from './types';
import SelectableCard from './SelectableCard';
import StepHeader from './StepHeader';

type AddressSelectionStepProps = {
  addresses: DeliveryAddress[];
  selectedId: string;
  useNewAddress: boolean;
  isNewAddressOpen: boolean;
  newAddress: NewDeliveryAddress;
  isPaid: boolean;
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
  showSelectionHelper: boolean;
  onBack: () => void;
  onSelectAddress: (id: string) => void;
  onOpenNewAddress: () => void;
  onCloseNewAddress: () => void;
  onUpdateNewAddress: (field: keyof NewDeliveryAddress, value: string) => void;
};

export default function AddressSelectionStep({
  addresses,
  selectedId,
  useNewAddress,
  isNewAddressOpen,
  newAddress,
  isPaid,
  isLoading,
  error,
  onRetry,
  showSelectionHelper,
  onBack,
  onSelectAddress,
  onOpenNewAddress,
  onCloseNewAddress,
  onUpdateNewAddress
}: AddressSelectionStepProps) {
  return (
    <div className="sssw-wizard-body">
      <StepHeader
        title="Indirizzo di consegna"
        helper="Scegli un indirizzo salvato oppure aggiungine uno nuovo."
        onBack={onBack}
      />
      <div
        className={`sssw-select-list ${isNewAddressOpen ? 'sssw-select-list--muted' : ''}`}
        role="radiogroup"
        aria-label="Seleziona indirizzo"
      >
        {addresses.map((address) => (
          <SelectableCard
            key={address.id}
            selected={!useNewAddress && selectedId === address.id}
            badge={selectedId === address.id ? 'Attuale' : undefined}
            title={address.street}
            lines={[`${address.city} ${address.zip}`, address.country]}
            onClick={() => onSelectAddress(address.id)}
          />
        ))}
      </div>
      {isLoading && <p className="sssw-helper-text">Stiamo caricando gli indirizzi...</p>}
      {error && (
        <div className="sssw-alert">
          {error}
          <button type="button" className="sssw-link-button sssw-link-button--secondary" onClick={onRetry}>
            Riprova
          </button>
        </div>
      )}
      {showSelectionHelper && (
        <p className="sssw-helper-text">Seleziona un indirizzo per continuare</p>
      )}
      {!isNewAddressOpen && (
        <button
          type="button"
          className="sssw-new-address-card"
          onClick={onOpenNewAddress}
          disabled={!isPaid}
        >
          <span className="sssw-new-address-title">+ Nuovo indirizzo</span>
          <span className="sssw-new-address-subtitle">Compila un nuovo indirizzo di consegna.</span>
        </button>
      )}

      {isNewAddressOpen && (
        <div className="sssw-new-address-form">
          <div className="sssw-new-address-header">
            <p className="sssw-new-address-heading">Nuovo indirizzo</p>
            <button type="button" className="sssw-link-button" onClick={onCloseNewAddress}>
              Chiudi
            </button>
          </div>
          <div className="sssw-new-address sssw-new-address--compact">
            <label className="sssw-field">
              <span>
                Via <span className="sssw-required">*</span>
              </span>
              <input
                type="text"
                value={newAddress.street}
                onChange={(event) => onUpdateNewAddress('street', event.target.value)}
                disabled={!isPaid}
              />
              {useNewAddress && !newAddress.street.trim() && (
                <span className="sssw-error">Campo obbligatorio.</span>
              )}
            </label>
            <div className="sssw-new-address-grid">
              <label className="sssw-field">
                <span>
                  Citta <span className="sssw-required">*</span>
                </span>
                <input
                  type="text"
                  value={newAddress.city}
                  onChange={(event) => onUpdateNewAddress('city', event.target.value)}
                  disabled={!isPaid}
                />
                {useNewAddress && !newAddress.city.trim() && (
                  <span className="sssw-error">Campo obbligatorio.</span>
                )}
              </label>
              <label className="sssw-field">
                <span>
                  CAP <span className="sssw-required">*</span>
                </span>
                <input
                  type="text"
                  value={newAddress.zip}
                  onChange={(event) => onUpdateNewAddress('zip', event.target.value)}
                  disabled={!isPaid}
                />
                {useNewAddress && !newAddress.zip.trim() && (
                  <span className="sssw-error">Campo obbligatorio.</span>
                )}
              </label>
              <label className="sssw-field">
                <span>
                  Paese <span className="sssw-required">*</span>
                </span>
                <input
                  type="text"
                  value={newAddress.country}
                  onChange={(event) => onUpdateNewAddress('country', event.target.value)}
                  disabled={!isPaid}
                />
                {useNewAddress && !newAddress.country.trim() && (
                  <span className="sssw-error">Campo obbligatorio.</span>
                )}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
