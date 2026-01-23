// Toggle real backend adapter (true) vs mock adapter (false); UI code stays unchanged.
// When true, BE/Odoo integration is expected to be live behind httpAddressApi.
export const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
