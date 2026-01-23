export type ViewState = 'ACCESS' | 'LOADING' | 'DATA';

export type Option = {
  name: string;
  value: string;
};

export type Product = {
  name: string;
  brand: string;
  options: Option[];
  state: string;
  quantity: number;
  shipping_date?: string;
  shipping_tracking_url?: string;
  delivery_date?: string;
};

export type Invoice = {
  number: string;
  date: string;
  state: string;
  url: string;
};

export type OrderResponse = {
  date_order: string;
  state: string;
  products: Product[];
  invoices: Invoice[];
};

export type DeliveryAddress = {
  id: string;
  street: string;
  city: string;
  zip: string;
  country: string;
};

export type NewDeliveryAddress = {
  street: string;
  city: string;
  zip: string;
  country: string;
};

export type EditableDetails = {
  deliveryAddresses: DeliveryAddress[];
  selectedDeliveryId: string;
  newDeliveryAddress: NewDeliveryAddress;
  contactEmail: string;
  contactPhone: string;
};

export type EditableDiff = {
  field: string;
  before: string;
  after: string;
};

export type FlowType = 'shipping' | 'info' | 'cancel';

export type ApiMode = 'test' | 'mohd';
export type ConfirmStatus = 'idle' | 'loading' | 'success' | 'error';
