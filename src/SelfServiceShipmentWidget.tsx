import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './SelfServiceShipmentWidget.scss';
import AccessView from './components/shipment-widget/AccessView';
import AddressSelectionStep from './components/shipment-widget/AddressSelectionStep';
import CancelStep from './components/shipment-widget/CancelStep';
import ChoiceListItem from './components/shipment-widget/ChoiceListItem';
import ContactInfoStep from './components/shipment-widget/ContactInfoStep';
import Drawer from './components/shipment-widget/Drawer';
import LoadingView from './components/shipment-widget/LoadingView';
import useShipmentAddresses from './components/shipment-widget/hooks/useShipmentAddresses';
import OrderSummaryPanel, { OrderSummaryDetails } from './components/shipment-widget/OrderSummaryPanel';
import ReviewStep from './components/shipment-widget/ReviewStep';
import StepHeader from './components/shipment-widget/StepHeader';
import mockResponse from './components/shipment-widget/mockData';
import type {
  ApiMode,
  ConfirmStatus,
  DeliveryAddress,
  EditableDetails,
  FlowType,
  NewDeliveryAddress,
  OrderResponse,
  ViewState
} from './components/shipment-widget/types';
import type { Address } from './components/shipment-widget/api/types';
import {
  buildApiUrl,
  computeEditableDiff,
  createEditableDefaults,
  emailRegex,
  formatDeliveryAddress,
  isAddressComplete
} from './components/shipment-widget/utils';
const initialAccess = {
  orderId: '',
  email: ''
};
const initialFlow: FlowType | null = null;
const MOHD_ORDER_NUMBER = 'ECOMMSO180809';
const MOHD_ORDER_EMAIL = 'dariotoscano@gmail.com';
const MOCK_ORDER_NUMBER = 'MOCK-20458';
const MOCK_ORDER_EMAIL = 'mock@mohd.it';

type SnapshotInput = {
  deliveryAddresses: Address[];
  selectedDeliveryId: string;
  newDeliveryAddress: NewDeliveryAddress;
  contactEmail: string;
  contactPhone: string;
};

const toDeliveryAddresses = (addresses: Address[]): DeliveryAddress[] =>
  addresses.map((address) => ({
    id: address.id,
    street: address.street,
    city: address.city,
    zip: address.zip,
    country: address.country
  }));

const buildSnapshot = ({
  deliveryAddresses,
  selectedDeliveryId,
  newDeliveryAddress,
  contactEmail,
  contactPhone
}: SnapshotInput): EditableDetails => ({
  deliveryAddresses: toDeliveryAddresses(deliveryAddresses),
  selectedDeliveryId,
  newDeliveryAddress,
  contactEmail,
  contactPhone
});

type SelfServiceShipmentWidgetProps = {
  onProgressChange?: (value: number) => void;
};

// Wizard orchestrator only: address/domain logic lives in hooks/adapters for BE/Odoo drop-in.
export default function SelfServiceShipmentWidget({ onProgressChange }: SelfServiceShipmentWidgetProps) {
  const [view, setView] = useState<ViewState>('ACCESS');
  const [displayView, setDisplayView] = useState<ViewState>('ACCESS');
  const [isExiting, setIsExiting] = useState(false);

  const [apiMode, setApiMode] = useState<ApiMode>('test');
  const [access, setAccess] = useState(initialAccess);
  const [errors, setErrors] = useState<{ orderId?: string; email?: string }>({});
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [newDeliveryAddress, setNewDeliveryAddress] = useState<NewDeliveryAddress>({
    street: '',
    city: '',
    zip: '',
    country: ''
  });
  const [baselineSnapshot, setBaselineSnapshot] = useState<EditableDetails | null>(null);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flowType, setFlowType] = useState<FlowType | null>(initialFlow);
  const [isNewAddressOpen, setIsNewAddressOpen] = useState(false);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>('idle');
  const [confirmOutcome, setConfirmOutcome] = useState<Exclude<ConfirmStatus, 'idle' | 'loading'>>(
    'success'
  );
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [hasStartedEdit, setHasStartedEdit] = useState(false);
  const canEdit = isPaid && order?.state !== 'completed';
  const {
    addresses,
    selectedAddressId,
    loading: addressesLoading,
    errorMessage: addressesErrorMessage,
    syncStatus,
    syncErrorMessage,
    refresh: refreshAddresses,
    select: selectAddress,
    create: createAddress,
    setDelivery
  } = useShipmentAddresses({
    customerId: access.email.trim(),
    isActive: view === 'DATA'
  });
  const hasGeneralChanges = useMemo(() => {
    if (!baselineSnapshot) {
      return false;
    }
    return (
      contactEmail !== baselineSnapshot.contactEmail ||
      contactPhone !== baselineSnapshot.contactPhone
    );
  }, [contactEmail, contactPhone, baselineSnapshot]);

  useEffect(() => {
    if (view !== displayView) {
      setIsExiting(true);
      const timer = window.setTimeout(() => {
        setDisplayView(view);
        setIsExiting(false);
      }, 180);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [view, displayView]);

  useEffect(() => {
    if (confirmStatus !== 'loading') return undefined;
    const timer = window.setTimeout(() => {
      setConfirmStatus(confirmOutcome);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [confirmStatus, confirmOutcome]);

  useEffect(() => {
    if (view !== 'DATA' || baselineSnapshot) return;
    if (!contactEmail && !contactPhone) return;
    setBaselineSnapshot(
      buildSnapshot({
        deliveryAddresses: addresses,
        selectedDeliveryId: selectedAddressId,
        newDeliveryAddress,
        contactEmail,
        contactPhone
      })
    );
  }, [
    view,
    baselineSnapshot,
    addresses,
    selectedAddressId,
    newDeliveryAddress,
    contactEmail,
    contactPhone
  ]);

  useEffect(() => {
    if (!onProgressChange) return;
    if (view !== 'DATA' || !hasStartedEdit) {
      onProgressChange(0);
      return;
    }
    if (step === 1) {
      onProgressChange(1 / 3);
      return;
    }
    if (step === 2) {
      onProgressChange(2 / 3);
      return;
    }
    onProgressChange(1);
  }, [view, step, hasStartedEdit, onProgressChange]);
  const handleAccessSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedOrderId = access.orderId.trim();
    const trimmedEmail = access.email.trim();
    const nextErrors: { orderId?: string; email?: string } = {};

    if (!trimmedOrderId) {
      nextErrors.orderId = 'Order ID richiesto.';
    }

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      nextErrors.email = 'Email non valida.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    console.log('[ACCESS] submit', { orderId: trimmedOrderId, email: trimmedEmail, apiMode });
    setView('LOADING');

    const delay = 900 + Math.floor(Math.random() * 500);
    window.setTimeout(() => {
      const response = mockResponse;
      const paid = response.invoices.some((invoice) => invoice.state === 'paid');

      if (apiMode === 'mohd') {
        const url = buildApiUrl(trimmedOrderId, trimmedEmail, apiMode);
        console.log('[LOADING] real fetch start', { url, apiMode });
        void fetch(url)
          .then(async (res) => {
            const body = await res.text();
            console.log('[LOADING] real fetch response', {
              status: res.status,
              ok: res.ok,
              body,
              apiMode
            });
          })
          .catch((error) => {
            console.log('[LOADING] real fetch error', { error, apiMode });
          });
      }

      console.log('[LOADING] mock fetch OK', { response, isPaid: paid, apiMode: 'test' });
      setOrder(response);
      const defaults = createEditableDefaults(trimmedEmail);
      setContactEmail(defaults.contactEmail);
      setContactPhone(defaults.contactPhone);
      setNewDeliveryAddress(defaults.newDeliveryAddress);
      setBaselineSnapshot(null);
      setStep(1);
      setFlowType(initialFlow);
      setIsNewAddressOpen(false);
      setUseNewAddress(false);
      setIsPaid(paid);
      setCancelConfirmed(false);
      setConfirmStatus('idle');
      setHasStartedEdit(false);
      setView('DATA');
    }, delay);
  };

  const selectFlow = (nextFlow: FlowType) => {
    if (!canEdit) return;
    setFlowType(nextFlow);
    setStep(2);
    setConfirmStatus('idle');
    if (nextFlow !== 'cancel') {
      setCancelConfirmed(false);
    }
  };

  const handleConfirmChanges = async () => {
    if (!flowType) return;
    if (!baselineSnapshot) return;
    if (!canEdit) return;

    if (flowType === 'cancel') {
      if (!cancelConfirmed) return;
      setConfirmOutcome('success');
      setConfirmStatus('loading');
      console.log('[DATA] mock cancel request', {
        orderId: access.orderId.trim(),
        email: access.email.trim(),
        isPaid
      });
      return;
    }

    const shouldCreateAddress =
      flowType === 'shipping' && useNewAddress && isAddressComplete(newDeliveryAddress);

    setConfirmOutcome('success');
    setConfirmStatus('loading');

    try {
      const currentSnapshot: EditableDetails = buildSnapshot({
        deliveryAddresses: addresses,
        selectedDeliveryId: selectedAddressId,
        contactEmail,
        contactPhone,
        newDeliveryAddress
      });
      let nextSnapshot = currentSnapshot;
      if (flowType === 'shipping') {
        if (shouldCreateAddress) {
          const address = await createAddress(newDeliveryAddress);
          await setDelivery(access.orderId.trim(), address.id);
          nextSnapshot = buildSnapshot({
            deliveryAddresses: [...addresses, address],
            selectedDeliveryId: address.id,
            newDeliveryAddress,
            contactEmail,
            contactPhone
          });
        } else {
          await setDelivery(access.orderId.trim(), selectedAddressId);
        }
      }

      const nextDiff = computeEditableDiff(baselineSnapshot, nextSnapshot);
      console.log('[DATA] mock submit changes', {
        before: baselineSnapshot,
        after: nextSnapshot,
        diff: nextDiff,
        orderId: access.orderId.trim(),
        email: access.email.trim(),
        isPaid,
        action: flowType
      });

      setNewDeliveryAddress({
        street: '',
        city: '',
        zip: '',
        country: ''
      });
      setBaselineSnapshot({
        ...nextSnapshot,
        newDeliveryAddress: {
          street: '',
          city: '',
          zip: '',
          country: ''
        }
      });
      setConfirmStatus('success');
    } catch (error) {
      console.log('[DATA] submit error', { error });
      setConfirmOutcome('error');
      setConfirmStatus('error');
    }
  };

  const renderData = () => {
    if (!order) return <LoadingView />;

    const hasSelectedDelivery = Boolean(selectedAddressId);
    const hasNewAddress = isAddressComplete(newDeliveryAddress);
    const canContinueShipping = useNewAddress ? hasNewAddress : hasSelectedDelivery;
    const canContinueInfo = hasGeneralChanges;
    const canContinueCancel = cancelConfirmed;
    const selectedDelivery = addresses.find((address) => address.id === selectedAddressId);
    const reviewAddress = useNewAddress && hasNewAddress ? newDeliveryAddress : selectedDelivery;
    const isConfirming = confirmStatus === 'loading';
    const showSelectionHelper = !useNewAddress && !hasSelectedDelivery;
    const isAddressStep = step === 2 && flowType === 'shipping';
    const showWizard = hasStartedEdit;
    const showOrderPanel = !showWizard;

    const showConfirmButton =
      (flowType === 'cancel' && cancelConfirmed) ||
      (flowType === 'shipping' && (useNewAddress ? hasNewAddress : hasSelectedDelivery)) ||
      (flowType === 'info' && hasGeneralChanges);

    const handleSelectAddress = (addressId: string) => {
      setUseNewAddress(false);
      setIsNewAddressOpen(false);
      selectAddress(addressId);
    };

    const handleOpenNewAddress = () => {
      setUseNewAddress(true);
      setIsNewAddressOpen(true);
    };

    const handleCloseNewAddress = () => {
      setIsNewAddressOpen(false);
      if (!isAddressComplete(newDeliveryAddress)) {
        setUseNewAddress(false);
      }
    };

    const handleUpdateNewAddress = (field: keyof NewDeliveryAddress, value: string) => {
      setUseNewAddress(true);
      setNewDeliveryAddress((current) => ({
        ...current,
        [field]: value
      }));
    };

    return (
      <div className="sssw-data">
        <div className="sssw-data-layout">
          {showOrderPanel && (
            <div className="sssw-data-left sssw-data-left--center">
              <OrderSummaryPanel
                order={order}
                isCompact={isAddressStep}
                onOpenDetails={() => setIsOrderDetailsOpen(true)}
                showEditCta
                onStartEdit={() => {
                  if (!canEdit) return;
                  setHasStartedEdit(true);
                  setStep(1);
                  setFlowType(initialFlow);
                  setConfirmStatus('idle');
                }}
                canEdit={canEdit}
                deliveryAddress={formatDeliveryAddress(selectedDelivery)}
                contactPhone={contactPhone}
                contactEmail={contactEmail}
              />
            </div>
          )}

          {showWizard && (
            <div className="sssw-data-right">
              <div className="sssw-edit sssw-wizard">
                {step === 1 && (
                  <div className="sssw-wizard-body">
                  <StepHeader
                    title="Cosa desideri modificare?"
                    helper="Seleziona l'operazione che desideri effettuare sul tuo ordine."
                    onBack={() => setHasStartedEdit(false)}
                  />
                  {!canEdit && (
                    <div className="sssw-alert">
                      Le modifiche sono disponibili solo per ordini pagati e non completati.
                    </div>
                  )}
                  <div className={`sssw-choice-list ${!canEdit ? 'sssw-edit-body--disabled' : ''}`}>
                    <ChoiceListItem
                      label="Indirizzo di consegna"
                      description="Scegli un indirizzo salvato o aggiungine uno nuovo."
                      onClick={() => selectFlow('shipping')}
                      disabled={!canEdit}
                    />
                    <ChoiceListItem
                      label="Modifica informazioni"
                      description="Aggiorna email e telefono di contatto."
                      onClick={() => selectFlow('info')}
                      disabled={!canEdit}
                    />
                    <ChoiceListItem
                      label="Cancella ordine"
                      description="Invia una richiesta di annullamento ordine."
                      onClick={() => selectFlow('cancel')}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              )}

              {step === 2 && flowType === 'shipping' && (
                <AddressSelectionStep
                  addresses={addresses}
                  selectedId={selectedAddressId}
                  useNewAddress={useNewAddress}
                  isNewAddressOpen={isNewAddressOpen}
                  newAddress={newDeliveryAddress}
                  isPaid={canEdit}
                  isLoading={addressesLoading}
                  error={addressesErrorMessage ?? undefined}
                  onRetry={refreshAddresses}
                  showSelectionHelper={showSelectionHelper}
                  onBack={() => setStep(1)}
                  onSelectAddress={handleSelectAddress}
                  onOpenNewAddress={handleOpenNewAddress}
                  onCloseNewAddress={handleCloseNewAddress}
                  onUpdateNewAddress={handleUpdateNewAddress}
                />
              )}

              {step === 2 && flowType === 'info' && (
                <ContactInfoStep
                  contactEmail={contactEmail}
                  contactPhone={contactPhone}
                  isPaid={canEdit}
                  onBack={() => setStep(1)}
                  onChangeEmail={setContactEmail}
                  onChangePhone={setContactPhone}
                />
              )}

              {step === 2 && flowType === 'cancel' && (
                <CancelStep
                  cancelConfirmed={cancelConfirmed}
                  isPaid={canEdit}
                  onBack={() => setStep(1)}
                  onToggle={setCancelConfirmed}
                />
              )}

              {step === 3 && flowType && (
                <ReviewStep
                  flowType={flowType}
                  editable={{
                    deliveryAddresses: [],
                    selectedDeliveryId: selectedAddressId,
                    newDeliveryAddress,
                    contactEmail,
                    contactPhone
                  }}
                  reviewAddress={reviewAddress}
                  confirmStatus={confirmStatus}
                  isConfirming={isConfirming}
                  syncStatus={syncStatus}
                  syncErrorMessage={syncErrorMessage}
                  onRetrySync={
                    syncStatus === 'FAILED' && selectedAddressId
                      ? () => {
                          void setDelivery(access.orderId.trim(), selectedAddressId);
                        }
                      : undefined
                  }
                  onBack={confirmStatus === 'idle' ? () => setStep(2) : undefined}
                />
              )}

              {(step === 2 || step === 3) && (
                <div className="sssw-wizard-footer">
                  {step === 2 && flowType === 'shipping' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={() => setStep(3)}
                      disabled={!canContinueShipping || !canEdit}
                    >
                      Continua
                    </button>
                  )}
                  {step === 2 && flowType === 'info' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={() => setStep(3)}
                      disabled={!canContinueInfo || !canEdit}
                    >
                      Continua
                    </button>
                  )}
                  {step === 2 && flowType === 'cancel' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={() => setStep(3)}
                      disabled={!canContinueCancel || !canEdit}
                    >
                      Continua
                    </button>
                  )}
                  {step === 3 && flowType && confirmStatus === 'idle' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={handleConfirmChanges}
                      disabled={!showConfirmButton || !canEdit}
                    >
                      Conferma
                    </button>
                  )}
                    {step === 3 && flowType && confirmStatus !== 'idle' && (
                      <button
                        type="button"
                        className="sssw-button sssw-button--primary"
                        onClick={() => {
                          setConfirmStatus('idle');
                          setStep(1);
                          setFlowType(initialFlow);
                          setCancelConfirmed(false);
                          setUseNewAddress(false);
                          setIsNewAddressOpen(false);
                        }}
                      >
                        Chiudi
                      </button>
                    )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        <Drawer
          isOpen={isOrderDetailsOpen}
          title="Riepilogo ordine"
          side="left"
          onClose={() => setIsOrderDetailsOpen(false)}
        >
          <OrderSummaryDetails
            order={order}
            deliveryAddress={formatDeliveryAddress(selectedDelivery)}
            contactPhone={contactPhone}
            contactEmail={contactEmail}
          />
        </Drawer>
      </div>
    );
  };

  const viewContent = () => {
    switch (displayView) {
      case 'ACCESS':
        return (
          <AccessView
            apiMode={apiMode}
            access={access}
            errors={errors}
            onUseTestData={() => {
              setApiMode('test');
              setAccess({ orderId: MOCK_ORDER_NUMBER, email: MOCK_ORDER_EMAIL });
            }}
            onUseMohdData={() => {
              setApiMode('mohd');
              setAccess({ orderId: MOHD_ORDER_NUMBER, email: MOHD_ORDER_EMAIL });
            }}
            onUpdateAccess={setAccess}
            onSubmit={handleAccessSubmit}
          />
        );
      case 'LOADING':
        return <LoadingView />;
      case 'DATA':
        return renderData();
      default:
        return null;
    }
  };

  return (
    <section className="sssw-card" aria-live="polite">
      <div
        key={displayView}
        className={`sssw-view ${isExiting ? 'sssw-view--exit' : 'sssw-view--enter'}`}
      >
        {viewContent()}
      </div>
    </section>
  );
}
