import type { AddressApi, ApiError, Address, AddressInput, SyncResponse } from './types';

const API_BASE = '';

const parseError = async (response: Response): Promise<ApiError> => {
  try {
    const data = (await response.json()) as ApiError;
    if (data.code && data.message) {
      return data;
    }
  } catch {
    // Ignore parse errors.
  }
  return { code: 'UNKNOWN', message: 'Errore di rete.' };
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
};

// Backend integration adapter: replace ONLY this file to connect the real BE/Odoo stack.
// FE must not implement Odoo workflows; all Odoo sync rules live in BE.
export const httpAddressApi: AddressApi = {
  // BE endpoint: GET /customers/{customerId}/addresses
  // BE responsibilities: validation, dedup, Odoo sync orchestration, and source-of-truth data.
  // Odoo: resolve/merge canonical address state from Odoo (if needed) before returning.
  // Response: { items: Address[] } or error { code, message, fields? }.
  async listAddresses(customerId: string) {
    const response = await requestJson<{ items: Address[] }>(
      `/customers/${customerId}/addresses`
    );
    return response.items;
  },
  // BE endpoint: POST /customers/{customerId}/addresses
  // BE responsibilities: validation, dedup, persistence, Odoo sync scheduling.
  // Odoo: enqueue/create address in Odoo and return local id + status.
  // Response: Address or error { code, message, fields? }.
  async createAddress(customerId: string, payload: AddressInput) {
    return requestJson(`/customers/${customerId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  // BE endpoint: PUT /addresses/{addressId}
  // BE responsibilities: validation, dedup, update semantics, Odoo sync scheduling.
  // Odoo: update address in Odoo (async allowed) and return updated address.
  // Response: Address or error { code, message, fields? }.
  async updateAddress(addressId: string, payload: AddressInput) {
    return requestJson(`/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  // BE endpoint: PATCH /orders/{orderId}/delivery-address
  // BE responsibilities: enforce order state, perform/queue Odoo sync, return async status.
  // Odoo: set delivery address on order; may return SYNCING/PENDING with jobId.
  // Response: SyncResponse or error { code, message, fields? }.
  async setOrderDeliveryAddress(orderId: string, addressId: string, deliveryInstructions?: string) {
    const body = { addressId, deliveryInstructions };
    return requestJson<SyncResponse>(`/orders/${orderId}/delivery-address`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }
};
