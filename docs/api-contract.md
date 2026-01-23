# Address API Contract (Draft)

Il backend e' source of truth; la FE non deduplica ne' normalizza oltre validazioni di forma. La sync Odoo e' responsabilita' BE e puo' essere async.

## Endpoints

### List addresses
- GET `/customers/{customerId}/addresses`
- Response 200:
```json
{
  "items": [
    {
      "id": "addr-123",
      "street": "Via Roma 12",
      "city": "Milano",
      "zip": "20121",
      "country": "Italia",
      "label": "Casa",
      "firstName": "Mario",
      "lastName": "Rossi",
      "phone": "+39 333 1234567",
      "email": "mario@rossi.it",
      "isDefaultShipping": true,
      "isBilling": false,
      "odooId": "ODOO-456",
      "updatedAt": "2024-12-12T10:00:00Z"
    }
  ]
}
```

### Create address
- POST `/customers/{customerId}/addresses`
- Body:
```json
{
  "street": "Via Roma 12",
  "city": "Milano",
  "zip": "20121",
  "country": "Italia",
  "label": "Casa",
  "firstName": "Mario",
  "lastName": "Rossi",
  "phone": "+39 333 1234567",
  "email": "mario@rossi.it"
}
```
- Response 201:
```json
{
  "id": "addr-123",
  "street": "Via Roma 12",
  "city": "Milano",
  "zip": "20121",
  "country": "Italia",
  "label": "Casa",
  "firstName": "Mario",
  "lastName": "Rossi",
  "phone": "+39 333 1234567",
  "email": "mario@rossi.it",
  "isDefaultShipping": true,
  "isBilling": false,
  "odooId": "ODOO-456",
  "updatedAt": "2024-12-12T10:00:00Z"
}
```

### Update address
- PUT `/addresses/{addressId}`
- Body:
```json
{
  "street": "Via Torino 8",
  "city": "Milano",
  "zip": "20123",
  "country": "Italia",
  "label": "Ufficio",
  "phone": "+39 333 1234567"
}
```
- Response 200: same shape as Create address

### Set order delivery address
- PATCH `/orders/{orderId}/delivery-address`
- Body (by id):
```json
{
  "addressId": "addr-123",
  "deliveryInstructions": "Citofono Bianchi"
}
```
- Response 200:
```json
{
  "status": "SYNCING",
  "addressId": "addr-123",
  "jobId": "job-456",
  "lastSyncError": null,
  "retryAfterSeconds": 60
}
```

## Async sync (Odoo)
- `status` puo' essere `PENDING`, `SYNCING`, `SYNCED`, `FAILED`.
- Se `FAILED`, `lastSyncError` contiene il messaggio da mostrare e `retryAfterSeconds` il cooldown.
- Polling opzionale: `GET /orders/{orderId}/delivery-address/sync/{jobId}`.

## Error codes (minimi)
- `INVALID_ZIP`
- `INVALID_PHONE`
- `REQUIRED_FIELD`
- `ADDRESS_EXISTS`
- `ADDRESS_NOT_FOUND`
- `ORDER_LOCKED`
- `FORBIDDEN`
- `UNKNOWN`
