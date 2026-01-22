import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import './SelfServiceShipmentWidget.scss';

type ViewState = 'ACCESS' | 'LOADING' | 'DATA';

type Option = {
  name: string;
  value: string;
};

type Product = {
  name: string;
  brand: string;
  options: Option[];
  state: string;
  quantity: number;
  shipping_date?: string;
  shipping_tracking_url?: string;
  delivery_date?: string;
};

type Invoice = {
  number: string;
  date: string;
  state: string;
  url: string;
};

type OrderResponse = {
  date_order: string;
  state: string;
  products: Product[];
  invoices: Invoice[];
};

type DeliveryAddress = {
  id: string;
  street: string;
  city: string;
  zip: string;
  country: string;
};

type NewDeliveryAddress = {
  street: string;
  city: string;
  zip: string;
  country: string;
};

type EditableDetails = {
  deliveryAddresses: DeliveryAddress[];
  selectedDeliveryId: string;
  newDeliveryAddress: NewDeliveryAddress;
  contactEmail: string;
  contactPhone: string;
};

type EditableDiff = {
  field: string;
  before: string;
  after: string;
};

type FlowType = 'shipping' | 'info' | 'cancel';

type ApiMode = 'test' | 'mohd';
type ConfirmStatus = 'idle' | 'loading' | 'success' | 'error';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialAccess = {
  orderId: '',
  email: ''
};

const initialFlow: FlowType | null = null;

const TEST_ORDER_NUMBER = 'ECOMMSO180809';
const TEST_ORDER_EMAIL = 'dariotoscano@gmail.com';

const mockResponse: OrderResponse = {
  date_order: '2024-12-12T00:00:00.000Z',
  state: 'completed',
  products: [
    {
      name: 'Platform Tray',
      brand: 'Muuto',
      options: [{ name: 'Choose the Finish', value: 'Grey' }],
      state: 'shipped',
      quantity: 1,
      shipping_date: '2024-12-20T18:55:07.000Z',
      shipping_tracking_url: 'https://www.dhl.com/...tracking-id=...',
      delivery_date: '2024-12-24T00:00:00.000Z'
    }
  ],
  invoices: [
    {
      number: '4/E/2024/5768',
      date: '2024-12-12',
      state: 'paid',
      url: 'https://myorder.mohd.it/invoice?order=...&email=...&invoice=...'
    }
  ]
};

const createEditableDefaults = (email: string): EditableDetails => ({
  deliveryAddresses: [
    {
      id: 'addr-1',
      street: 'Via Roma 12',
      city: 'Milano',
      zip: '20121',
      country: 'Italia'
    },
    {
      id: 'addr-2',
      street: 'Via Torino 8',
      city: 'Milano',
      zip: '20123',
      country: 'Italia'
    }
  ],
  selectedDeliveryId: 'addr-1',
  newDeliveryAddress: {
    street: '',
    city: '',
    zip: '',
    country: ''
  },
  contactEmail: email,
  contactPhone: '+39 02 1234 5678'
});

const cloneEditable = (details: EditableDetails): EditableDetails => ({
  deliveryAddresses: details.deliveryAddresses.map((address) => ({ ...address })),
  selectedDeliveryId: details.selectedDeliveryId,
  newDeliveryAddress: { ...details.newDeliveryAddress },
  contactEmail: details.contactEmail,
  contactPhone: details.contactPhone
});

const isAddressComplete = (address: NewDeliveryAddress) =>
  [address.street, address.city, address.zip, address.country].every((value) => value.trim() !== '');

const formatDeliveryAddress = (address?: { street: string; city: string; zip: string; country: string }) => {
  if (!address) return '-';
  return `${address.street}, ${address.city} ${address.zip}, ${address.country}`;
};

const computeEditableDiff = (before: EditableDetails, after: EditableDetails): EditableDiff[] => {
  const diff: EditableDiff[] = [];
  const push = (field: string, prev: string, next: string) => {
    if (prev !== next) {
      diff.push({ field, before: prev, after: next });
    }
  };

  const beforeSelected = before.deliveryAddresses.find(
    (address) => address.id === before.selectedDeliveryId
  );
  const afterSelected = after.deliveryAddresses.find(
    (address) => address.id === after.selectedDeliveryId
  );
  push(
    'Indirizzo di consegna - selezione',
    formatDeliveryAddress(beforeSelected),
    formatDeliveryAddress(afterSelected)
  );

  if (isAddressComplete(after.newDeliveryAddress)) {
    push('Nuovo indirizzo - Via', '', after.newDeliveryAddress.street);
    push('Nuovo indirizzo - Citta', '', after.newDeliveryAddress.city);
    push('Nuovo indirizzo - CAP', '', after.newDeliveryAddress.zip);
    push('Nuovo indirizzo - Paese', '', after.newDeliveryAddress.country);
  }
  push('Contatto - Email', before.contactEmail, after.contactEmail);
  push('Contatto - Telefono', before.contactPhone, after.contactPhone);

  return diff;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatStateLabel = (value?: string) => {
  if (!value) return '-';
  const normalized = value.toLowerCase();
  const labels: Record<string, string> = {
    completed: 'Completato',
    shipped: 'Spedito',
    processing: 'In lavorazione',
    pending: 'In attesa',
    cancelled: 'Annullato'
  };
  if (labels[normalized]) return labels[normalized];
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const buildApiUrl = (orderId: string, email: string, mode: ApiMode) => {
  const encodedOrderId = encodeURIComponent(orderId);
  const encodedEmail = encodeURIComponent(email);
  if (mode === 'test') {
    return `https://myorder.mohd.it/api/search_intercom?order_number=${encodedOrderId}&order_email=${encodedEmail}`;
  }
  return `https://myorder.mohd.it/api/search_intercom?order=${encodedOrderId}&email=${encodedEmail}`;
};

type StepHeaderProps = {
  title: string;
  helper?: string;
  stepLabel: string;
  onBack?: () => void;
};

const StepHeader = ({ title, helper, stepLabel, onBack }: StepHeaderProps) => (
  <div className="sssw-step-header">
    <div className="sssw-step-top">
      {onBack ? (
        <button type="button" className="sssw-link-button sssw-link-button--back" onClick={onBack}>
          Indietro
        </button>
      ) : (
        <span className="sssw-step-spacer" aria-hidden="true" />
      )}
      <span className="sssw-step-indicator">{stepLabel}</span>
    </div>
    <p className="sssw-step-title">{title}</p>
    {helper && <p className="sssw-step-helper">{helper}</p>}
  </div>
);

type ChoiceListItemProps = {
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
};

const ChoiceListItem = ({ label, description, onClick, disabled }: ChoiceListItemProps) => (
  <button type="button" className="sssw-choice-item" onClick={onClick} disabled={disabled}>
    <div className="sssw-choice-text">
      <span className="sssw-choice-label">{label}</span>
      <span className="sssw-choice-description">{description}</span>
    </div>
    <span className="sssw-choice-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path d="M6 3.5 10.5 8 6 12.5" />
      </svg>
    </span>
  </button>
);

type SelectableCardProps = {
  selected: boolean;
  onClick: () => void;
  badge?: string;
  children: ReactNode;
};

const SelectableCard = ({ selected, onClick, badge, children }: SelectableCardProps) => (
  <button
    type="button"
    className={`sssw-select-card ${selected ? 'sssw-select-card--active' : ''}`}
    onClick={onClick}
  >
    <div className="sssw-select-card-content">{children}</div>
    <div className="sssw-select-card-right">
      {badge && <span className="sssw-select-card-badge">{badge}</span>}
      <span className={`sssw-select-card-check ${selected ? 'sssw-select-card-check--active' : ''}`}>
        <svg viewBox="0 0 20 20">
          <path d="M7.8 13.3 4.7 10.2l-1.4 1.4 4.5 4.5 8.1-8.1-1.4-1.4-6.7 6.7Z" />
        </svg>
      </span>
    </div>
  </button>
);

type CollapsibleFormCardProps = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

const CollapsibleFormCard = ({ title, isOpen, onToggle, children }: CollapsibleFormCardProps) => (
  <div className={`sssw-collapse-card ${isOpen ? 'sssw-collapse-card--open' : ''}`}>
    <button type="button" className="sssw-collapse-trigger" onClick={onToggle}>
      <span>{title}</span>
      <span className={`sssw-collapse-icon ${isOpen ? 'sssw-collapse-icon--open' : ''}`}>
        <svg viewBox="0 0 16 16">
          <path d="M3.5 6 8 10.5 12.5 6" />
        </svg>
      </span>
    </button>
    {isOpen && <div className="sssw-collapse-body">{children}</div>}
  </div>
);

type ReviewSummaryProps = {
  title: string;
  children: ReactNode;
};

const ReviewSummary = ({ title, children }: ReviewSummaryProps) => (
  <div className="sssw-review">
    <p className="sssw-review-title">{title}</p>
    <div className="sssw-review-content">{children}</div>
  </div>
);

export default function SelfServiceShipmentWidget() {
  const [view, setView] = useState<ViewState>('ACCESS');
  const [displayView, setDisplayView] = useState<ViewState>('ACCESS');
  const [isExiting, setIsExiting] = useState(false);

  const [apiMode, setApiMode] = useState<ApiMode>('test');
  const [access, setAccess] = useState(initialAccess);
  const [errors, setErrors] = useState<{ orderId?: string; email?: string }>({});
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [editable, setEditable] = useState<EditableDetails | null>(null);
  const [editableBaseline, setEditableBaseline] = useState<EditableDetails | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flowType, setFlowType] = useState<FlowType | null>(initialFlow);
  const [isNewAddressOpen, setIsNewAddressOpen] = useState(false);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>('idle');
  const [confirmOutcome, setConfirmOutcome] = useState<Exclude<ConfirmStatus, 'idle' | 'loading'>>(
    'success'
  );
  const hasGeneralChanges = useMemo(() => {
    if (!editable || !editableBaseline) {
      return false;
    }
    return (
      editable.contactEmail !== editableBaseline.contactEmail ||
      editable.contactPhone !== editableBaseline.contactPhone
    );
  }, [editable, editableBaseline]);

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

    if (apiMode === 'mohd' || apiMode === 'test') {
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

      console.log('[LOADING] mock fetch OK', { response, isPaid: paid });
      setOrder(response);
      const defaults = createEditableDefaults(trimmedEmail);
      setEditable(defaults);
      setEditableBaseline(cloneEditable(defaults));
      setStep(1);
      setFlowType(initialFlow);
      setIsNewAddressOpen(false);
      setUseNewAddress(false);
      setIsPaid(paid);
      setCancelConfirmed(false);
      setConfirmStatus('idle');
      setView('DATA');
    }, delay);
  };

  const selectFlow = (nextFlow: FlowType) => {
    if (!isPaid) return;
    setFlowType(nextFlow);
    setStep(2);
    setConfirmStatus('idle');
    if (nextFlow !== 'cancel') {
      setCancelConfirmed(false);
    }
  };

  const updateEditable = (updater: (current: EditableDetails) => EditableDetails) => {
    setEditable((prev) => (prev ? updater(prev) : prev));
  };

  const handleConfirmChanges = () => {
    if (!flowType) return;
    if (!editable || !editableBaseline) return;
    if (!isPaid) return;

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

    const shouldCreateAddress = flowType === 'shipping' && useNewAddress && isAddressComplete(editable.newDeliveryAddress);
    const newAddressId = shouldCreateAddress ? `addr-${Date.now()}` : null;
    const nextEditable = shouldCreateAddress
      ? {
          ...editable,
          deliveryAddresses: [
            ...editable.deliveryAddresses,
            {
              id: newAddressId ?? '',
              ...editable.newDeliveryAddress
            }
          ],
          selectedDeliveryId: newAddressId ?? editable.selectedDeliveryId
        }
      : editable;
    const nextDiff = computeEditableDiff(editableBaseline, nextEditable);
    setConfirmOutcome('success');
    setConfirmStatus('loading');
    console.log('[DATA] mock submit changes', {
      before: editableBaseline,
      after: nextEditable,
      diff: nextDiff,
      orderId: access.orderId.trim(),
      email: access.email.trim(),
      isPaid,
      action: flowType
    });

    const resetEditable = shouldCreateAddress
      ? {
          ...nextEditable,
          newDeliveryAddress: {
            street: '',
            city: '',
            zip: '',
            country: ''
          }
        }
      : nextEditable;
    setEditable(resetEditable);
    setEditableBaseline(cloneEditable(resetEditable));
  };

  const resetAll = () => {
    setAccess(initialAccess);
    setErrors({});
    setOrder(null);
    setEditable(null);
    setEditableBaseline(null);
    setIsPaid(false);
    setCancelConfirmed(false);
    setStep(1);
    setFlowType(initialFlow);
    setIsNewAddressOpen(false);
    setUseNewAddress(false);
    setConfirmStatus('idle');
    setView('ACCESS');
  };

  const orderSummary = useMemo(() => {
    if (!order) return null;
    return {
      date: formatDate(order.date_order),
      state: formatStateLabel(order.state)
    };
  }, [order]);

  const renderAccess = () => (
    <div className="sssw-access">
      <div className="sssw-env">
        <span className="sssw-env-label">Ambiente</span>
        <div className="sssw-env-group">
          <button
            type="button"
            className={`sssw-env-button ${apiMode === 'test' ? 'sssw-env-button--active' : ''}`}
            onClick={() => {
              setApiMode('test');
              setAccess({ orderId: TEST_ORDER_NUMBER, email: TEST_ORDER_EMAIL });
            }}
          >
            Test
          </button>
          <button
            type="button"
            className={`sssw-env-button ${apiMode === 'mohd' ? 'sssw-env-button--active' : ''}`}
            onClick={() => setApiMode('mohd')}
          >
            MOHD
          </button>
        </div>
      </div>

      <form className="sssw-form" onSubmit={handleAccessSubmit}>
        <h2 className="sssw-title">Accesso spedizione</h2>
        <p className="sssw-subtitle">Inserisci ordine ed email per recuperare i dati.</p>

        <label className="sssw-field">
          <span>Order ID</span>
          <input
            type="text"
            value={access.orderId}
            onChange={(event) => setAccess((prev) => ({ ...prev, orderId: event.target.value }))}
            placeholder="Es. ORD-45892"
          />
          {errors.orderId && <span className="sssw-error">{errors.orderId}</span>}
        </label>

        <label className="sssw-field">
          <span>Email</span>
          <input
            type="email"
            value={access.email}
            onChange={(event) => setAccess((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="nome@dominio.it"
          />
          {errors.email && <span className="sssw-error">{errors.email}</span>}
        </label>

        <button type="submit" className="sssw-button sssw-button--primary">
          Accedi
        </button>
      </form>
    </div>
  );

  const renderLoading = () => (
    <div className="sssw-loading">
      <div className="sssw-spinner" aria-hidden="true" />
      <p>Caricamento...</p>
    </div>
  );

  const renderData = () => {
    if (!order || !editable) return null;
    const hasSelectionChange =
      !!editableBaseline && editable.selectedDeliveryId !== editableBaseline.selectedDeliveryId;
    const showConfirmButton =
      (flowType === 'cancel' && cancelConfirmed) ||
      (flowType === 'shipping' && (useNewAddress ? isAddressComplete(editable.newDeliveryAddress) : hasSelectionChange)) ||
      (flowType === 'info' && hasGeneralChanges);
    const selectedDelivery =
      editable.deliveryAddresses.find((address) => address.id === editable.selectedDeliveryId) ??
      editable.deliveryAddresses[0];
    const hasNewAddress = isAddressComplete(editable.newDeliveryAddress);
    const canContinueShipping = useNewAddress ? hasNewAddress : Boolean(hasSelectionChange);
    const canContinueInfo = hasGeneralChanges;
    const canContinueCancel = cancelConfirmed;
    const reviewAddress = useNewAddress && hasNewAddress ? editable.newDeliveryAddress : selectedDelivery;
    const isConfirming = confirmStatus === 'loading';
    const isConfirmed = confirmStatus === 'success';

    return (
      <div className="sssw-data">
        <div className="sssw-data-layout">
          <div className="sssw-data-left">
            <div className="sssw-order-head">
              <div>
                <p className="sssw-order-label">Data ordine</p>
                <p className="sssw-order-date">{orderSummary?.date ?? '-'}</p>
              </div>
              <span className="sssw-state-badge">{orderSummary?.state ?? '-'}</span>
            </div>

            {/* Contatti e consegna: contesto operativo, non modifiche */}
            <div className="sssw-block">
              <p className="sssw-block-title">Contatti e consegna</p>
              <div className="sssw-summary">
                <div className="sssw-summary-row">
                  <span className="sssw-summary-label">Email contatto</span>
                  <span className="sssw-summary-value">{editable.contactEmail || '-'}</span>
                </div>
                <div className="sssw-summary-row">
                  <span className="sssw-summary-label">Telefono contatto</span>
                  <span className="sssw-summary-value">{editable.contactPhone || '-'}</span>
                </div>
                <div className="sssw-summary-row">
                  <span className="sssw-summary-label">Indirizzo di consegna</span>
                  <span className="sssw-summary-value">
                    {formatDeliveryAddress(selectedDelivery)}
                  </span>
                </div>
              </div>
            </div>

            <div className="sssw-block">
              <p className="sssw-block-title">Prodotti</p>
              <div className="sssw-product-list">
                {order.products.map((product) => (
                  <div key={`${product.name}-${product.brand}`} className="sssw-product">
                    <div className="sssw-product-header">
                      <div>
                        <p className="sssw-product-name">{product.name}</p>
                        <p className="sssw-product-brand">{product.brand}</p>
                      </div>
                      <span className="sssw-product-qty">Qta {product.quantity}</span>
                    </div>

                    {product.options.length > 0 && (
                      <div className="sssw-option-list">
                        {product.options.map((option) => (
                          <div key={`${option.name}-${option.value}`} className="sssw-option-row">
                            <span className="sssw-option-name">{option.name}</span>
                            <span className="sssw-option-value">{option.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="sssw-product-meta">
                      <span>Stato</span>
                      <span>{formatStateLabel(product.state)}</span>
                    </div>
                    {product.shipping_date && (
                      <div className="sssw-product-meta">
                        <span>Data spedizione</span>
                        <span>{formatDateTime(product.shipping_date)}</span>
                      </div>
                    )}
                    {product.delivery_date && (
                      <div className="sssw-product-meta">
                        <span>Data consegna</span>
                        <span>{formatDate(product.delivery_date)}</span>
                      </div>
                    )}
                    {product.shipping_tracking_url && (
                      <a
                        className="sssw-link"
                        href={product.shipping_tracking_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Traccia spedizione
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="sssw-block">
              <p className="sssw-block-title">Fatture</p>
              <div className="sssw-invoice-list">
                {order.invoices.map((invoice) => (
                  <div key={invoice.number} className="sssw-invoice">
                    <div className="sssw-invoice-row">
                      <div>
                        <p className="sssw-invoice-number">{invoice.number}</p>
                        <p className="sssw-invoice-date">{formatDate(invoice.date)}</p>
                      </div>
                      <span
                        className={`sssw-badge ${invoice.state === 'paid' ? 'sssw-badge--paid' : ''}`}
                      >
                        {invoice.state === 'paid' ? 'Pagata' : formatStateLabel(invoice.state)}
                      </span>
                    </div>
                    <a className="sssw-link" href={invoice.url} target="_blank" rel="noreferrer">
                      Scarica fattura
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sssw-data-right">
            <div className="sssw-edit sssw-wizard">
              {step === 1 && (
                <div className="sssw-wizard-body">
                  <StepHeader
                    title="Cosa desideri modificare?"
                    helper="Seleziona l'operazione che desideri effettuare sul tuo ordine."
                    stepLabel="1 di 3"
                  />
                  {!isPaid && (
                    <div className="sssw-alert">
                      Le modifiche sono disponibili solo per ordini con fattura pagata.
                    </div>
                  )}
                  <div className={`sssw-choice-list ${!isPaid ? 'sssw-edit-body--disabled' : ''}`}>
                    <ChoiceListItem
                      label="Indirizzo di consegna"
                      description="Scegli un indirizzo salvato o aggiungine uno nuovo."
                      onClick={() => selectFlow('shipping')}
                      disabled={!isPaid}
                    />
                    <ChoiceListItem
                      label="Modifica informazioni"
                      description="Aggiorna email e telefono di contatto."
                      onClick={() => selectFlow('info')}
                      disabled={!isPaid}
                    />
                    <ChoiceListItem
                      label="Cancella ordine"
                      description="Invia una richiesta di annullamento ordine."
                      onClick={() => selectFlow('cancel')}
                      disabled={!isPaid}
                    />
                  </div>
                </div>
              )}

              {step === 2 && flowType === 'shipping' && (
                <div className="sssw-wizard-body">
                  <StepHeader
                    title="Indirizzo di consegna"
                    helper="Scegli un indirizzo salvato oppure aggiungine uno nuovo."
                    stepLabel="2 di 3"
                    onBack={() => setStep(1)}
                  />
                  <div className="sssw-select-list">
                    {editable.deliveryAddresses.map((address) => (
                      <SelectableCard
                        key={address.id}
                        selected={!useNewAddress && editable.selectedDeliveryId === address.id}
                        badge={editable.selectedDeliveryId === address.id ? 'Attuale' : undefined}
                        onClick={() => {
                          setUseNewAddress(false);
                          updateEditable((current) => ({
                            ...current,
                            selectedDeliveryId: address.id
                          }));
                        }}
                      >
                        <div className="sssw-select-card-lines">
                          <span>{address.street}</span>
                          <span>{`${address.city} ${address.zip}`}</span>
                          <span>{address.country}</span>
                        </div>
                      </SelectableCard>
                    ))}
                  </div>

                  <CollapsibleFormCard
                    title="+ Aggiungi nuovo indirizzo"
                    isOpen={isNewAddressOpen}
                    onToggle={() => setIsNewAddressOpen((prev) => !prev)}
                  >
                    <div className="sssw-new-address">
                      <label className="sssw-field">
                        <span>
                          Via <span className="sssw-required">*</span>
                        </span>
                        <input
                          type="text"
                          value={editable.newDeliveryAddress.street}
                          onChange={(event) =>
                            updateEditable((current) => ({
                              ...current,
                              newDeliveryAddress: {
                                ...current.newDeliveryAddress,
                                street: event.target.value
                              }
                            }))
                          }
                          onInput={() => setUseNewAddress(true)}
                          disabled={!isPaid}
                        />
                        {useNewAddress && !editable.newDeliveryAddress.street.trim() && (
                          <span className="sssw-error">Campo obbligatorio.</span>
                        )}
                      </label>
                      <label className="sssw-field">
                        <span>
                          Citta <span className="sssw-required">*</span>
                        </span>
                        <input
                          type="text"
                          value={editable.newDeliveryAddress.city}
                          onChange={(event) =>
                            updateEditable((current) => ({
                              ...current,
                              newDeliveryAddress: {
                                ...current.newDeliveryAddress,
                                city: event.target.value
                              }
                            }))
                          }
                          onInput={() => setUseNewAddress(true)}
                          disabled={!isPaid}
                        />
                        {useNewAddress && !editable.newDeliveryAddress.city.trim() && (
                          <span className="sssw-error">Campo obbligatorio.</span>
                        )}
                      </label>
                      <div className="sssw-field-grid">
                        <label className="sssw-field">
                          <span>
                            CAP <span className="sssw-required">*</span>
                          </span>
                          <input
                            type="text"
                            value={editable.newDeliveryAddress.zip}
                            onChange={(event) =>
                              updateEditable((current) => ({
                                ...current,
                                newDeliveryAddress: {
                                  ...current.newDeliveryAddress,
                                  zip: event.target.value
                                }
                              }))
                            }
                            onInput={() => setUseNewAddress(true)}
                            disabled={!isPaid}
                          />
                          {useNewAddress && !editable.newDeliveryAddress.zip.trim() && (
                            <span className="sssw-error">Campo obbligatorio.</span>
                          )}
                        </label>
                        <label className="sssw-field">
                          <span>
                            Paese <span className="sssw-required">*</span>
                          </span>
                          <input
                            type="text"
                            value={editable.newDeliveryAddress.country}
                            onChange={(event) =>
                              updateEditable((current) => ({
                                ...current,
                                newDeliveryAddress: {
                                  ...current.newDeliveryAddress,
                                  country: event.target.value
                                }
                              }))
                            }
                            onInput={() => setUseNewAddress(true)}
                            disabled={!isPaid}
                          />
                          {useNewAddress && !editable.newDeliveryAddress.country.trim() && (
                            <span className="sssw-error">Campo obbligatorio.</span>
                          )}
                        </label>
                      </div>
                    </div>
                  </CollapsibleFormCard>
                </div>
              )}

              {step === 2 && flowType === 'info' && (
                <div className="sssw-wizard-body">
                  <StepHeader
                    title="Modifica informazioni"
                    helper="Aggiorna i riferimenti di contatto associati all'ordine."
                    stepLabel="2 di 3"
                    onBack={() => setStep(1)}
                  />
                  <div className="sssw-fieldset">
                    <label className="sssw-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={editable.contactEmail}
                        onChange={(event) =>
                          updateEditable((current) => ({
                            ...current,
                            contactEmail: event.target.value
                          }))
                        }
                        disabled={!isPaid}
                      />
                    </label>
                    <label className="sssw-field">
                      <span>Telefono</span>
                      <input
                        type="tel"
                        value={editable.contactPhone}
                        onChange={(event) =>
                          updateEditable((current) => ({
                            ...current,
                            contactPhone: event.target.value
                          }))
                        }
                        disabled={!isPaid}
                      />
                    </label>
                  </div>
                </div>
              )}

              {step === 2 && flowType === 'cancel' && (
                <div className="sssw-wizard-body">
                  <StepHeader
                    title="Cancella ordine"
                    helper="La richiesta annulla l'ordine e invia una conferma via email."
                    stepLabel="2 di 3"
                    onBack={() => setStep(1)}
                  />
                  <div className="sssw-cancel">
                    <label className="sssw-cancel-check">
                      <input
                        type="checkbox"
                        checked={cancelConfirmed}
                        onChange={(event) => setCancelConfirmed(event.target.checked)}
                        disabled={!isPaid}
                      />
                      <span>Confermo di voler cancellare l'ordine.</span>
                    </label>
                  </div>
                </div>
              )}

              {step === 3 && flowType && (
                <div className="sssw-wizard-body">
                  <StepHeader
                    title="Rivedi e conferma"
                    helper="Controlla i dettagli prima di inviare la richiesta."
                    stepLabel="3 di 3"
                    onBack={confirmStatus === 'idle' ? () => setStep(2) : undefined}
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
                        <span>La cancellazione verra' inviata all'assistenza.</span>
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
                      ) : (
                        <div className="sssw-confirm-success">
                          <span className="sssw-confirm-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4.3-12.7a1 1 0 0 0-1.4-1.4l-4.1 4.1-1.7-1.7a1 1 0 0 0-1.4 1.4l2.4 2.4a1 1 0 0 0 1.4 0l4.8-4.8Z" />
                            </svg>
                          </span>
                          <p className="sssw-confirm-title">Modifica salvata</p>
                          <p className="sssw-confirm-text">Abbiamo registrato la tua richiesta.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(step === 2 || step === 3) && (
                <div className="sssw-wizard-footer">
                  {step === 2 && flowType === 'shipping' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={() => setStep(3)}
                      disabled={!canContinueShipping || !isPaid}
                    >
                      Continua
                    </button>
                  )}
                  {step === 2 && flowType === 'info' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={() => setStep(3)}
                      disabled={!canContinueInfo || !isPaid}
                    >
                      Continua
                    </button>
                  )}
                  {step === 2 && flowType === 'cancel' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={() => setStep(3)}
                      disabled={!canContinueCancel || !isPaid}
                    >
                      Continua
                    </button>
                  )}
                  {step === 3 && flowType && confirmStatus === 'idle' && (
                    <button
                      type="button"
                      className="sssw-button sssw-button--primary"
                      onClick={handleConfirmChanges}
                      disabled={!showConfirmButton || !isPaid}
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
                  {confirmStatus === 'idle' && (
                    <button
                      type="button"
                      className="sssw-link-button sssw-link-button--secondary"
                      onClick={() => {
                        setConfirmStatus('idle');
                        setStep(1);
                        setFlowType(initialFlow);
                        setCancelConfirmed(false);
                      }}
                    >
                      Annulla
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const viewContent = () => {
    switch (displayView) {
      case 'ACCESS':
        return renderAccess();
      case 'LOADING':
        return renderLoading();
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
