import { useState } from 'react';
import type { OrderResponse } from './types';
import { formatDate, formatDateTime, formatStateLabel } from './utils';

type OrderSummaryPanelProps = {
  order: OrderResponse;
  isCompact: boolean;
  onOpenDetails: () => void;
  showEditCta?: boolean;
  onStartEdit?: () => void;
  canEdit?: boolean;
  deliveryAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export default function OrderSummaryPanel({
  order,
  isCompact,
  onOpenDetails,
  showEditCta = false,
  onStartEdit,
  canEdit = true,
  deliveryAddress,
  contactPhone,
  contactEmail
}: OrderSummaryPanelProps) {
  const products = Array.isArray(order.products) ? order.products : [];
  const primaryProduct = products[0];

  return (
    <div className={`sssw-order-panel ${isCompact ? 'sssw-order-panel--compact' : ''}`}>
      <div className="sssw-order-head">
        <div>
          <p className="sssw-order-label">Data ordine</p>
          <p className="sssw-order-date">{formatDate(order.date_order)}</p>
        </div>
        <div className="sssw-order-head-actions">
          <span className="sssw-state-badge">{formatStateLabel(order.state)}</span>
          {showEditCta && (
            <button
              type="button"
              className={`sssw-order-edit-button ${!canEdit ? 'sssw-order-edit-button--disabled' : ''}`}
              onClick={onStartEdit}
              disabled={!canEdit}
            >
              Modifica
            </button>
          )}
        </div>
      </div>

      {isCompact ? (
        <div className="sssw-order-compact">
          {primaryProduct ? (
            <div className="sssw-order-compact-product">
              <div>
                <p className="sssw-order-compact-title">{primaryProduct.name}</p>
                <p className="sssw-order-compact-meta">{primaryProduct.brand}</p>
              </div>
              <span className="sssw-product-qty">Qty {primaryProduct.quantity}</span>
            </div>
          ) : (
            <p className="sssw-empty">Nessun prodotto disponibile.</p>
          )}
          <button type="button" className="sssw-link-button sssw-order-link" onClick={onOpenDetails}>
            Vedi dettagli ordine
          </button>
        </div>
      ) : (
        <OrderSummaryDetails
          order={order}
          deliveryAddress={deliveryAddress}
          contactPhone={contactPhone}
          contactEmail={contactEmail}
        />
      )}
    </div>
  );
}

type OrderSummaryDetailsProps = {
  order: OrderResponse;
  deliveryAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export function OrderSummaryDetails({
  order,
  deliveryAddress,
  contactPhone,
  contactEmail
}: OrderSummaryDetailsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isInvoicesOpen, setIsInvoicesOpen] = useState(false);
  const products = Array.isArray(order.products) ? order.products : [];
  const invoices = Array.isArray(order.invoices) ? order.invoices : [];
  const summaryRows = [
    { label: 'Data ordine', value: formatDate(order.date_order) },
    { label: 'Stato', value: formatStateLabel(order.state) },
    { label: 'Articoli', value: products.length ? String(products.length) : '' },
    { label: 'Indirizzo consegna', value: deliveryAddress },
    { label: 'Telefono', value: contactPhone },
    { label: 'Email', value: contactEmail }
  ].filter((row) => row.value && row.value !== '-');

  return (
    <>
      <div className="sssw-block sssw-block--section">
        <p className="sssw-block-title">Riepilogo ordine</p>
        <div className="sssw-summary">
          {summaryRows.map((row) => (
            <div key={row.label} className="sssw-summary-row">
              <span className="sssw-summary-label">{row.label}</span>
              <span className="sssw-summary-value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {products.length > 0 && (
        <div className="sssw-block sssw-block--section">
          <button
            type="button"
            className="sssw-block-toggle"
            onClick={() => setIsProductsOpen((prev) => !prev)}
          >
            <span>Prodotti</span>
            <span className={`sssw-block-toggle-icon ${isProductsOpen ? 'sssw-block-toggle-icon--open' : ''}`}>
              <svg viewBox="0 0 16 16">
                <path d="M4 6.5 8 10.5 12 6.5" />
              </svg>
            </span>
          </button>
          {isProductsOpen && (
            <div className="sssw-product-list sssw-product-list--compact">
              {products.map((product, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <div
                  key={`${product.name}-${index}`}
                  className={`sssw-product-row ${isExpanded ? 'sssw-product-row--open' : ''}`}
                >
                  <button
                    type="button"
                    className="sssw-product-row-header"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    <span className="sssw-product-row-main">
                      <span className="sssw-product-name">{product.name}</span>
                      <span className="sssw-product-brand">{product.brand}</span>
                    </span>
                    <span className="sssw-product-row-meta">
                      <span className="sssw-product-state">{formatStateLabel(product.state)}</span>
                      <span className="sssw-product-qty">Qty {product.quantity}</span>
                      <span className="sssw-product-row-toggle" aria-hidden="true">
                        <svg viewBox="0 0 16 16">
                          <path d="M4 6.5 8 10.5 12 6.5" />
                        </svg>
                      </span>
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="sssw-product-row-body">
                      {product.options.length > 0 && (
                        <div className="sssw-product-details">
                          {product.options.map((option) => (
                            <div key={option.name} className="sssw-product-detail-row">
                              <span className="sssw-product-detail-label">{option.name}</span>
                              <span className="sssw-product-detail-value">{option.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {product.shipping_date && (
                        <div className="sssw-product-detail-row">
                          <span className="sssw-product-detail-label">Data spedizione</span>
                          <span className="sssw-product-detail-value">
                            {formatDateTime(product.shipping_date)}
                          </span>
                        </div>
                      )}
                      {product.delivery_date && (
                        <div className="sssw-product-detail-row">
                          <span className="sssw-product-detail-label">Data consegna</span>
                          <span className="sssw-product-detail-value">{formatDate(product.delivery_date)}</span>
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
                  )}
                </div>
                  );
              })}
            </div>
          )}
        </div>
      )}

      {invoices.length > 0 && (
        <div className="sssw-block sssw-block--section">
          <button
            type="button"
            className="sssw-block-toggle"
            onClick={() => setIsInvoicesOpen((prev) => !prev)}
          >
            <span>Fatture</span>
            <span className={`sssw-block-toggle-icon ${isInvoicesOpen ? 'sssw-block-toggle-icon--open' : ''}`}>
              <svg viewBox="0 0 16 16">
                <path d="M4 6.5 8 10.5 12 6.5" />
              </svg>
            </span>
          </button>
          {isInvoicesOpen && (
            <div className="sssw-invoice-list">
              {invoices.map((invoice) => (
                <div key={invoice.number} className="sssw-invoice">
                  <div className="sssw-invoice-row">
                    <div>
                      <p className="sssw-invoice-number">{invoice.number}</p>
                      <p className="sssw-invoice-date">{formatDate(invoice.date)}</p>
                    </div>
                    <span className={`sssw-badge ${invoice.state === 'paid' ? 'sssw-badge--paid' : ''}`}>
                      {invoice.state === 'paid' ? 'Pagata' : formatStateLabel(invoice.state)}
                    </span>
                  </div>
                  <a className="sssw-link" href={invoice.url} target="_blank" rel="noreferrer">
                    Scarica fattura
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
