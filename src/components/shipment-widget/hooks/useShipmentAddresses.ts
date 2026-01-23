import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAddressApi } from '../api';
import type { Address, AddressInput, ApiError, SyncStatus, SyncResponse } from '../api/types';

type UseShipmentAddressesOptions = {
  customerId?: string;
  isActive: boolean;
};

type UseShipmentAddressesResult = {
  addresses: Address[];
  selectedAddressId: string;
  loading: boolean;
  error: ApiError | null;
  errorMessage: string | null;
  syncStatus: SyncStatus | null;
  syncErrorMessage: string | null;
  refresh: () => void;
  select: (addressId: string) => void;
  create: (payload: AddressInput) => Promise<Address>;
  update: (addressId: string, payload: AddressInput) => Promise<Address>;
  setDelivery: (orderId: string, addressId: string, deliveryInstructions?: string) => Promise<SyncResponse>;
};

const defaultError = { code: 'UNKNOWN', message: 'Si e' verificato un errore.' };
const errorMessages: Record<string, string> = {
  INVALID_ZIP: 'CAP non valido.',
  INVALID_PHONE: 'Numero di telefono non valido.',
  REQUIRED_FIELD: 'Completa i campi richiesti.',
  ADDRESS_NOT_FOUND: 'Indirizzo non disponibile.',
  ADDRESS_EXISTS: "L'indirizzo esiste gia'.",
  ORDER_LOCKED: "L'ordine non puo' essere modificato.",
  FORBIDDEN: 'Operazione non consentita.',
  NOT_IMPLEMENTED: 'Servizio non disponibile.',
  UNKNOWN: 'Si e' verificato un errore.'
};

const mapError = (error: unknown): ApiError => {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as ApiError;
  }
  return defaultError;
};

export default function useShipmentAddresses({
  customerId,
  isActive
}: UseShipmentAddressesOptions): UseShipmentAddressesResult {
  const api = useMemo(() => getAddressApi(), []);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const errorMessage = error ? errorMessages[error.code] ?? error.message : null;
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!customerId) return;
    // Thin client: only loading/error states; BE is source-of-truth.
    setLoading(true);
    setError(null);
    setSyncStatus(null);
    setSyncErrorMessage(null);
    try {
      const nextAddresses = await api.listAddresses(customerId);
      setAddresses(nextAddresses);
      setSelectedAddressId(nextAddresses[0]?.id ?? '');
    } catch (err) {
      setError(mapError(err));
    } finally {
      setLoading(false);
    }
  }, [api, customerId]);

  useEffect(() => {
    if (!isActive) return;
    void loadAddresses();
  }, [isActive, loadAddresses]);

  const refresh = useCallback(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const select = useCallback(
    (addressId: string) => {
      // Optimistic selection only; persistence happens via setDelivery.
      setSelectedAddressId(addressId);
    },
    []
  );

  const create = useCallback(
    async (payload: AddressInput) => {
      if (!customerId) {
        throw { code: 'FORBIDDEN', message: 'Cliente non disponibile.' };
      }
      // Create waits for BE response; no local dedup/merge.
      const address = await api.createAddress(customerId, payload);
      setAddresses((current) => [...current, address]);
      setSelectedAddressId(address.id);
      return address;
    },
    [api, customerId]
  );

  const update = useCallback(
    async (addressId: string, payload: AddressInput) => {
      // Update waits for BE response; UI updates from returned entity.
      const address = await api.updateAddress(addressId, payload);
      setAddresses((current) =>
        current.map((item) => (item.id === addressId ? address : item))
      );
      return address;
    },
    [api]
  );

  const setDelivery = useCallback(
    async (orderId: string, addressId: string, deliveryInstructions?: string) => {
      // BE may return async sync status; UI stays non-blocking.
      const response = await api.setOrderDeliveryAddress(orderId, addressId, deliveryInstructions);
      setSyncStatus(response.status);
      setSyncErrorMessage(response.lastSyncError ?? null);
      return response;
    },
    [api]
  );

  return {
    addresses,
    selectedAddressId,
    loading,
    error,
    errorMessage,
    syncStatus,
    syncErrorMessage,
    refresh,
    select,
    create,
    update,
    setDelivery
  };
}
