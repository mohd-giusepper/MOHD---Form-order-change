import { USE_REAL_API } from '../config';
import { httpAddressApi } from './httpAddressApi';
import { mockAddressApi } from './mockAddressApi';

// Feature flag: set VITE_USE_REAL_API=true to use real BE adapter without UI changes.
export const getAddressApi = () => (USE_REAL_API ? httpAddressApi : mockAddressApi);
