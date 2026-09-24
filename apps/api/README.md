# Shipment API

All shipment routes use the authenticated session cookie.

| Method | Endpoint                               | Roles                          |
| ------ | -------------------------------------- | ------------------------------ |
| POST   | `/api/shipments`                       | STAFF, ADMIN                   |
| GET    | `/api/shipments`                       | CUSTOMER, STAFF, ADMIN         |
| GET    | `/api/shipments/:id`                   | CUSTOMER, STAFF, ADMIN         |
| PATCH  | `/api/shipments/:id`                   | STAFF, ADMIN                   |
| DELETE | `/api/shipments/:id`                   | ADMIN                          |
| GET    | `/api/shipments/track/:trackingNumber` | Public                         |
| GET    | `/api/shipments/:id/events`            | CUSTOMER (owner), STAFF, ADMIN |
| POST   | `/api/shipments/:id/events`            | STAFF, ADMIN                   |
| PATCH  | `/api/shipments/:id/status`            | STAFF, ADMIN                   |

Customers are restricted to shipments where `customerId` matches the authenticated user. Shipment creation validates both addresses, creates the initial `CREATED` tracking event, and returns a generated immutable tracking number.

## List query parameters

`page`, `limit` (maximum 100), `search`, `status`, `serviceType`, `from`, `to`, `sortBy`, and `sortOrder` are validated by the API. List responses include `shipments` and `pagination` metadata.

Validation failures return `400` with `VALIDATION_ERROR`. Missing or inaccessible shipments return `404` with `SHIPMENT_NOT_FOUND`. Role failures return the existing `403` authorization response.

## Tracking

Public tracking normalizes the tracking number and returns only shipment status, service type, safe origin/destination geography, current location, and chronological events. It never returns customer or street-address data.

Status changes use the centralized transition graph. Each valid change atomically updates the shipment and creates a tracking event. Transitioning to `DELIVERED` sets `actualDelivery` on the server. `DELIVERED`, `CANCELLED`, and `RETURNED` are terminal states.

Tracking event requests accept `status`, optional `description`, `location`, `city`, `country`, coordinates, and a bounded historical `timestamp`. Clients cannot submit shipment IDs, event IDs, or creation timestamps.

## Packages

Shipments can reference zero or more `Package` documents through `packageIds`. A
package belongs to one shipment and has its own unique `packageNumber`, optional
package-level tracking number, dimensions, weight, and shipment-compatible
status. New package tracking events may include `packageId`; historical events
without a package reference remain valid. Existing shipment-level tracking by
`trackingNumber` is unchanged.

## E-commerce integration

The versioned server-to-server endpoint is `POST /api/v1/shipments`. It
requires `Authorization: Bearer <TRACKER_API_KEY>` and accepts an optional
`Idempotency-Key` header. The request contains external order/customer/seller
references, `carrier: "OherbTracker"`, `service`, sender and recipient snapshots,
and one package payload. Package units are accepted case-insensitively and are
stored using the domain values `KG`/`LB` and `CM`/`IN`.

The endpoint creates the shipment, package, and initial `LABEL_CREATED`
tracking event in one MongoDB session transaction. `externalOrderId` is backed
by a sparse unique index and duplicate requests return `409` with
`SHIPMENT_ALREADY_EXISTS`. `Idempotency-Key` is currently accepted but is not
persisted; full request-key replay semantics are deferred until a later phase.

Successful responses contain `shipmentId`, `shipmentNumber`, `trackingNumber`,
`externalOrderId`, `status`, and the created package's `packageId` and
`packageNumber`.
