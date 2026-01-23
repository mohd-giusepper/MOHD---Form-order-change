import type { OrderResponse } from './types';

const mockResponse: OrderResponse = {
  date_order: '2024-12-12T00:00:00.000Z',
  state: 'processing',
  products: [
    {
      name: 'Platform Tray',
      brand: 'Muuto',
      options: [{ name: 'Choose the Finish', value: 'Grey' }],
      state: 'processing',
      quantity: 1,
      shipping_date: '2024-12-20T18:55:07.000Z',
      shipping_tracking_url: 'https://www.dhl.com/...tracking-id=...'
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

export default mockResponse;
