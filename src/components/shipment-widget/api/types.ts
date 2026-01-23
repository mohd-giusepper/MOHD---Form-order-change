export type Address = {
  id: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  label?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  isDefaultShipping?: boolean;
  isBilling?: boolean;
  odooId?: string;
  updatedAt?: string;
};

export type AddressInput = {
  street: string;
  city: string;
  zip: string;
  country: string;
  label?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};

export type ApiError = {
  code: AddressValidationErrorCodes;
  message: string;
  fields?: Record<string, string>;
};

export type AddressValidationErrorCodes =
  | 'INVALID_ZIP'
  | 'INVALID_PHONE'
  | 'REQUIRED_FIELD'
  | 'ADDRESS_EXISTS'
  | 'ORDER_LOCKED'
  | 'FORBIDDEN'
  | 'UNKNOWN';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export type SyncResponse = {
  // Status of async sync with Odoo; FE treats this as informational only.
  status: SyncStatus;
  addressId: string;
  // Optional async job identifier; polling is BE-defined.
  jobId?: string;
  // Optional last error provided by BE when sync failed.
  lastSyncError?: string;
  // Optional cooldown before retrying a failed sync.
  retryAfterSeconds?: number;
};

export type AddressApi = {
  /**
   * List addresses for a customer. FE does not deduplicate or normalize beyond basic shape.
   * Odoo: BE should return the canonical address state (post-sync if applicable).
   */
  listAddresses: (customerId: string) => Promise<Address[]>;
  /**
   * Create an address only; does NOT set delivery on the order.
   * BE handles validation/dedup and Odoo sync side-effects.
   * Odoo: may create asynchronously; FE expects the address id immediately.
   */
  createAddress: (customerId: string, payload: AddressInput) => Promise<Address>;
  /**
   * Update an existing address; does NOT set delivery on the order.
   * Odoo: may update asynchronously; FE treats response as latest known state.
   */
  updateAddress: (addressId: string, payload: AddressInput) => Promise<Address>;
  /**
   * Set delivery address for an order; may return async sync status (Odoo).
   * Odoo: BE is responsible for order/address association rules.
   */
  setOrderDeliveryAddress: (
    orderId: string,
    addressId: string,
    deliveryInstructions?: string
  ) => Promise<SyncResponse>;
};
