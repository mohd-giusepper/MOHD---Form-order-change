# Backend integration (FE drop-in)

1) Implementare gli endpoint in `docs/api-contract.md`.
2) Restituire sempre gli errori come `{ code, message, fields? }`.
3) `setOrderDeliveryAddress` puo' rispondere con `SYNCING/PENDING/FAILED`.
4) Se async, valorizzare `jobId` e `retryAfterSeconds`.
5) La FE usa `VITE_USE_REAL_API=true` per attivare `httpAddressApi`.
6) L'adapter FE non deduplica e non normalizza dati oltre validazioni di forma.
7) In caso di errore di validazione usare `INVALID_*` o `REQUIRED_FIELD`.
8) In caso di ordine bloccato usare `ORDER_LOCKED` o `FORBIDDEN`.
9) Restituire sempre `addressId` e `status` dalla set delivery.
10) La FE gestisce retry quando `status=FAILED`.
