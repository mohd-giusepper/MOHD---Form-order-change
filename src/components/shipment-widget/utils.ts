import type { EditableDetails, EditableDiff, NewDeliveryAddress } from './types';
import type { ApiMode } from './types';

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createEditableDefaults = (email: string): EditableDetails => ({
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

export const cloneEditable = (details: EditableDetails): EditableDetails => ({
  deliveryAddresses: details.deliveryAddresses.map((address) => ({ ...address })),
  selectedDeliveryId: details.selectedDeliveryId,
  newDeliveryAddress: { ...details.newDeliveryAddress },
  contactEmail: details.contactEmail,
  contactPhone: details.contactPhone
});

export const isAddressComplete = (address: NewDeliveryAddress) =>
  [address.street, address.city, address.zip, address.country].every((value) => value.trim() !== '');

export const formatDeliveryAddress = (address?: {
  street: string;
  city: string;
  zip: string;
  country: string;
}) => {
  if (!address) return '-';
  return `${address.street}, ${address.city} ${address.zip}, ${address.country}`;
};

export const computeEditableDiff = (before: EditableDetails, after: EditableDetails): EditableDiff[] => {
  const diff: EditableDiff[] = [];
  const push = (field: string, prev: string, next: string) => {
    if (prev !== next) {
      diff.push({ field, before: prev, after: next });
    }
  };

  const beforeSelected = before.deliveryAddresses.find(
    (address) => address.id === before.selectedDeliveryId
  );
  const afterSelected = after.deliveryAddresses.find((address) => address.id === after.selectedDeliveryId);
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

export const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export const formatDateTime = (value?: string) => {
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

export const formatStateLabel = (value?: string) => {
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

export const buildApiUrl = (orderId: string, email: string, mode: ApiMode) => {
  const encodedOrderId = encodeURIComponent(orderId);
  const encodedEmail = encodeURIComponent(email);
  if (mode === 'test') {
    return `https://myorder.mohd.it/api/search_intercom?order_number=${encodedOrderId}&order_email=${encodedEmail}`;
  }
  return `https://myorder.mohd.it/api/search_intercom?order=${encodedOrderId}&email=${encodedEmail}`;
};
