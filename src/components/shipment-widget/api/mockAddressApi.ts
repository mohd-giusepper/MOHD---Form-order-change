import type { AddressApi, Address, AddressInput, SyncResponse } from './types';

const seedAddresses: Address[] = [
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
];

let mockAddresses = [...seedAddresses];

const createId = () => `addr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const mockAddressApi: AddressApi = {
  async listAddresses() {
    return [...mockAddresses];
  },
  async createAddress(_customerId: string, payload: AddressInput) {
    const address: Address = { id: createId(), ...payload };
    mockAddresses = [...mockAddresses, address];
    return address;
  },
  async updateAddress(addressId: string, payload: AddressInput) {
    mockAddresses = mockAddresses.map((address) =>
      address.id === addressId ? { ...address, ...payload } : address
    );
    const updated = mockAddresses.find((address) => address.id === addressId);
    if (!updated) {
      throw { code: 'ADDRESS_NOT_FOUND', message: 'Indirizzo non trovato.' };
    }
    return updated;
  },
  async setOrderDeliveryAddress(_orderId: string, addressId: string, _deliveryInstructions?: string) {
    const response: SyncResponse = {
      status: 'SYNCED',
      addressId
    };
    return response;
  }
};
