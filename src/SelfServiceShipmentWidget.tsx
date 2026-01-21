import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './SelfServiceShipmentWidget.scss';

type ViewState = 'ACCESS' | 'LOADING' | 'DATA' | 'CONFIRM';

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

type EditableShippingAddress = {
  street: string;
  city: string;
  zip: string;
  country: string;
};

type EditableDetails = {
  shippingAddress: EditableShippingAddress;
  contactEmail: string;
  contactPhone: string;
};

type EditableDiff = {
  field: string;
  before: string;
  after: string;
};

type EditSection = 'address' | 'general' | 'cancel' | null;

type ApiMode = 'test' | 'mohd';
type ConfirmStatus = 'idle' | 'loading' | 'success' | 'error';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialAccess = {
  orderId: '',
  email: ''
};

const initialSelection: EditSection = null;

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
  shippingAddress: {
    street: 'Via Roma 12',
    city: 'Milano',
    zip: '20121',
    country: 'Italia'
  },
  contactEmail: email,
  contactPhone: '+39 02 1234 5678'
});

const cloneEditable = (details: EditableDetails): EditableDetails => ({
  shippingAddress: { ...details.shippingAddress },
  contactEmail: details.contactEmail,
  contactPhone: details.contactPhone
});

const computeEditableDiff = (before: EditableDetails, after: EditableDetails): EditableDiff[] => {
  const diff: EditableDiff[] = [];
  const push = (field: string, prev: string, next: string) => {
    if (prev !== next) {
      diff.push({ field, before: prev, after: next });
    }
  };

  push('Indirizzo - Via', before.shippingAddress.street, after.shippingAddress.street);
  push('Indirizzo - Citta', before.shippingAddress.city, after.shippingAddress.city);
  push('Indirizzo - CAP', before.shippingAddress.zip, after.shippingAddress.zip);
  push('Indirizzo - Paese', before.shippingAddress.country, after.shippingAddress.country);
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
  const [editSelection, setEditSelection] = useState<EditSection>(initialSelection);
  const [diff, setDiff] = useState<EditableDiff[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [lastAction, setLastAction] = useState<EditSection>(null);
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>('idle');
  const [confirmOutcome, setConfirmOutcome] = useState<Exclude<ConfirmStatus, 'idle' | 'loading'>>(
    'success'
  );
  const [showAllDiff, setShowAllDiff] = useState(false);
  const { hasAddressChanges, hasGeneralChanges } = useMemo(() => {
    if (!editable || !editableBaseline) {
      return { hasAddressChanges: false, hasGeneralChanges: false };
    }
    const address = editable.shippingAddress;
    const baseAddress = editableBaseline.shippingAddress;
    const hasAddress =
      address.street !== baseAddress.street ||
      address.city !== baseAddress.city ||
      address.zip !== baseAddress.zip ||
      address.country !== baseAddress.country;
    const hasGeneral =
      editable.contactEmail !== editableBaseline.contactEmail ||
      editable.contactPhone !== editableBaseline.contactPhone;
    return { hasAddressChanges: hasAddress, hasGeneralChanges: hasGeneral };
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
    if (view === 'CONFIRM') {
      console.log('[CONFIRM] done');
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'CONFIRM' || confirmStatus !== 'loading') {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setConfirmStatus(confirmOutcome);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [view, confirmStatus, confirmOutcome]);

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
      setEditSelection(initialSelection);
      setDiff([]);
      setIsPaid(paid);
      setCancelConfirmed(false);
      setLastAction(null);
      setConfirmStatus('idle');
      setShowAllDiff(false);
      setView('DATA');
    }, delay);
  };

  const toggleEditSelection = (key: Exclude<EditSection, null>) => {
    if (!isPaid) return;
    setEditSelection((prev) => {
      const next = prev === key ? null : key;
      if (next !== 'cancel') {
        setCancelConfirmed(false);
      }
      return next;
    });
  };

  const updateEditable = (updater: (current: EditableDetails) => EditableDetails) => {
    setEditable((prev) => (prev ? updater(prev) : prev));
  };

  const handleConfirmChanges = () => {
    if (!editSelection) return;
    if (!editable || !editableBaseline) return;
    if (!isPaid) return;
    if (editSelection === 'address' && !hasAddressChanges) return;
    if (editSelection === 'general' && !hasGeneralChanges) return;
    if (editSelection === 'cancel') {
      if (!cancelConfirmed) return;
      setConfirmOutcome('success');
      setConfirmStatus('loading');
      setShowAllDiff(false);
      console.log('[DATA] mock cancel request', {
        orderId: access.orderId.trim(),
        email: access.email.trim(),
        isPaid
      });
      setDiff([]);
      setLastAction('cancel');
      setView('CONFIRM');
      return;
    }
    const nextDiff = computeEditableDiff(editableBaseline, editable);
    setConfirmOutcome('success');
    setConfirmStatus('loading');
    setShowAllDiff(false);
    console.log('[DATA] mock submit changes', {
      before: editableBaseline,
      after: editable,
      diff: nextDiff,
      orderId: access.orderId.trim(),
      email: access.email.trim(),
      isPaid,
      action: editSelection
    });

    setDiff(nextDiff);
    setEditableBaseline(cloneEditable(editable));
    setLastAction(editSelection);
    setView('CONFIRM');
  };

  const resetAll = () => {
    setAccess(initialAccess);
    setErrors({});
    setOrder(null);
    setEditable(null);
    setEditableBaseline(null);
    setEditSelection(initialSelection);
    setDiff([]);
    setIsPaid(false);
    setCancelConfirmed(false);
    setLastAction(null);
    setConfirmStatus('idle');
    setShowAllDiff(false);
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
    const showConfirmButton =
      (editSelection === 'cancel' && cancelConfirmed) ||
      (editSelection === 'address' && hasAddressChanges) ||
      (editSelection === 'general' && hasGeneralChanges);

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
                  <span className="sssw-summary-label">Indirizzo spedizione</span>
                  <span className="sssw-summary-value">
                    {`${editable.shippingAddress.street}, ${editable.shippingAddress.city} ${editable.shippingAddress.zip}, ${editable.shippingAddress.country}`}
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
            <div className="sssw-edit">
              <div className="sssw-edit-header">
                <p className="sssw-section-title">Cosa desideri modificare?</p>
                <p className="sssw-edit-hint">
                  Seleziona l'operazione che desideri effettuare sul tuo ordine.
                </p>
                {!isPaid && (
                  <div className="sssw-alert">
                    Le modifiche sono disponibili solo per ordini con fattura pagata.
                  </div>
                )}
              </div>

              <div className={`sssw-edit-body ${!isPaid ? 'sssw-edit-body--disabled' : ''}`}>
                <div className="sssw-pill-group">
                  {/* Primary actions: keep on a single line, same width */}
                  <button
                    type="button"
                    className={`sssw-pill ${editSelection === 'address' ? 'sssw-pill--active' : ''}`}
                    onClick={() => toggleEditSelection('address')}
                    disabled={!isPaid}
                  >
                    Cambia indirizzo
                  </button>
                  <button
                    type="button"
                    className={`sssw-pill ${editSelection === 'general' ? 'sssw-pill--active' : ''}`}
                    onClick={() => toggleEditSelection('general')}
                    disabled={!isPaid}
                  >
                    Modifica informazioni
                  </button>
                  <button
                    type="button"
                    className={`sssw-pill sssw-pill--danger ${editSelection === 'cancel' ? 'sssw-pill--active' : ''}`}
                    onClick={() => toggleEditSelection('cancel')}
                    disabled={!isPaid}
                  >
                    Cancella ordine
                  </button>
                </div>

                {editSelection === 'address' && (
                  <div className="sssw-fieldset">
                    <p className="sssw-fieldset-title">Aggiorna indirizzo</p>
                    <label className="sssw-field">
                      <span>Via</span>
                      <input
                        type="text"
                        value={editable.shippingAddress.street}
                        onChange={(event) =>
                          updateEditable((current) => ({
                            ...current,
                            shippingAddress: { ...current.shippingAddress, street: event.target.value }
                          }))
                        }
                        disabled={!isPaid}
                      />
                    </label>
                    <label className="sssw-field">
                      <span>Citta</span>
                      <input
                        type="text"
                        value={editable.shippingAddress.city}
                        onChange={(event) =>
                          updateEditable((current) => ({
                            ...current,
                            shippingAddress: { ...current.shippingAddress, city: event.target.value }
                          }))
                        }
                        disabled={!isPaid}
                      />
                    </label>
                    <div className="sssw-field-grid">
                      <label className="sssw-field">
                        <span>CAP</span>
                        <input
                          type="text"
                          value={editable.shippingAddress.zip}
                          onChange={(event) =>
                            updateEditable((current) => ({
                              ...current,
                              shippingAddress: { ...current.shippingAddress, zip: event.target.value }
                            }))
                          }
                          disabled={!isPaid}
                        />
                      </label>
                      <label className="sssw-field">
                        <span>Paese</span>
                        <input
                          type="text"
                          value={editable.shippingAddress.country}
                          onChange={(event) =>
                            updateEditable((current) => ({
                              ...current,
                              shippingAddress: { ...current.shippingAddress, country: event.target.value }
                            }))
                          }
                          disabled={!isPaid}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {editSelection === 'general' && (
                  <div className="sssw-fieldset">
                    <p className="sssw-fieldset-title">Aggiorna informazioni generali</p>
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
                )}

                {editSelection === 'cancel' && (
                  <div className="sssw-cancel">
                    <p className="sssw-cancel-title">Conferma richiesta cancellazione</p>
                    <p className="sssw-cancel-text">
                      La richiesta annulla l'ordine e invia una conferma via email.
                    </p>
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
                )}

                {/* Submit button appears only after real changes are present */}
                {showConfirmButton && (
                  <button
                    type="button"
                    className="sssw-button sssw-button--primary"
                    onClick={handleConfirmChanges}
                    disabled={!isPaid}
                  >
                    {editSelection === 'cancel' ? 'Invia richiesta cancellazione' : 'Conferma modifiche'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirm = () => {
    const isCancel = lastAction === 'cancel';
    const isLoading = confirmStatus === 'loading';
    const isError = confirmStatus === 'error';
    const hasDiff = !isCancel && diff.length > 0;
    const visibleDiff = showAllDiff ? diff : diff.slice(0, 3);
    const hasMoreDiff = diff.length > 3;
    return (
      <div className="sssw-confirm">
        {/* Confirmation hero: clean and centered for a premium feel. */}
        <div className="sssw-confirm-hero">
          {isLoading ? (
            <div className="sssw-spinner sssw-spinner--large" aria-hidden="true" />
          ) : (
            <span
              className={`sssw-confirm-icon ${isError ? 'sssw-confirm-icon--error' : 'sssw-confirm-icon--success'}`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4.3-12.7a1 1 0 0 0-1.4-1.4l-4.1 4.1-1.7-1.7a1 1 0 0 0-1.4 1.4l2.4 2.4a1 1 0 0 0 1.4 0l4.8-4.8Z" />
              </svg>
            </span>
          )}
          <p className="sssw-confirm-hero-title">
            {isLoading ? 'Stiamo aggiornando i dati' : 'Operazione completata'}
          </p>
          <p className="sssw-confirm-hero-text">
            {isLoading ? 'Attendi qualche secondo.' : 'Successo'}
          </p>
        </div>

        <h2 className="sssw-title">Modifiche inviate</h2>
        <p className="sssw-subtitle">Abbiamo registrato la tua richiesta.</p>

        {hasDiff && (
          <>
            <ul className="sssw-diff-list">
              {visibleDiff.map((item) => (
                <li key={item.field} className="sssw-diff-item">
                  <p className="sssw-diff-field">{item.field}</p>
                  <div className="sssw-diff-row">
                    <span className="sssw-diff-label">Prima</span>
                    <span className="sssw-diff-value">{item.before || '-'}</span>
                  </div>
                  <div className="sssw-diff-row">
                    <span className="sssw-diff-label">Dopo</span>
                    <span className="sssw-diff-value">{item.after || '-'}</span>
                  </div>
                </li>
              ))}
            </ul>
            {hasMoreDiff && (
              <button
                type="button"
                className="sssw-link-button"
                onClick={() => setShowAllDiff((prev) => !prev)}
              >
                {showAllDiff ? 'Nascondi dettagli' : 'Mostra dettagli'}
              </button>
            )}
          </>
        )}

        <div className="sssw-button-row">
          {/* Primary/secondary CTAs are intentionally fixed for consistency. */}
          <button type="button" className="sssw-button sssw-button--primary" onClick={() => setView('DATA')}>
            Torna ai dati
          </button>
          <button type="button" className="sssw-button sssw-button--ghost" onClick={resetAll}>
            Nuova ricerca
          </button>
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
      case 'CONFIRM':
        return renderConfirm();
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
