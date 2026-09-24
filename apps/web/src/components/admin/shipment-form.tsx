'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, createShipment, listCustomers, updateShipment, type CreateShipmentInput, type CustomerOption, type Shipment, type ShipmentAddressInput, type ServiceType } from '../../lib/api-client';
import { Alert, Input, Label, Select, Textarea } from '../ui/forms';
import { TrackingNumber } from '../ui/tracking-number';

const initialAddress = (address?: Shipment['origin']): ShipmentAddressInput => ({
  name: address?.name ?? '', phone: address?.phone ?? '', addressLine1: address?.addressLine1 ?? '',
  addressLine2: address?.addressLine2 ?? '', city: address?.city ?? '', state: address?.state ?? '',
  postalCode: address?.postalCode ?? '', country: address?.country ?? '',
});

export function ShipmentForm({ shipment }: { shipment?: Shipment }) {
  const router = useRouter();
  const editing = Boolean(shipment);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>((shipment?.serviceType as ServiceType) ?? 'STANDARD');
  const [origin, setOrigin] = useState<ShipmentAddressInput>(initialAddress(shipment?.origin));
  const [destination, setDestination] = useState<ShipmentAddressInput>(initialAddress(shipment?.destination));
  const [weight, setWeight] = useState(shipment?.weight?.toString() ?? '');
  const [description, setDescription] = useState(shipment?.description ?? '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(shipment?.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().slice(0, 10) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) return;
    const timeout = window.setTimeout(() => {
      setCustomersLoading(true);
      void listCustomers(customerSearch)
        .then((result) => setCustomers(result.customers))
        .catch(() => setCustomers([]))
        .finally(() => setCustomersLoading(false));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [customerSearch, editing]);

  function updateAddress(setter: (value: ShipmentAddressInput) => void, address: ShipmentAddressInput, field: keyof ShipmentAddressInput, value: string) {
    if (field === 'latitude' || field === 'longitude') {
      const numericValue = value === '' ? undefined : Number(value);
      setter({ ...address, [field]: numericValue });
      return;
    }
    setter({ ...address, [field]: value });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!editing && !customerId.trim()) { setError('Select a customer before creating the shipment.'); return; }
    const requiredFields = (address: ShipmentAddressInput) => [
      address.name,
      address.phone,
      address.addressLine1,
      address.city,
      address.postalCode,
      address.country,
    ];
    const required = [...requiredFields(origin), ...requiredFields(destination)].some((value) => !value.trim());
    const coordinatesComplete = (address: ShipmentAddressInput) =>
      (address.latitude === undefined) === (address.longitude === undefined);
    if (!coordinatesComplete(origin) || !coordinatesComplete(destination)) {
      setError('Enter both latitude and longitude for a location, or leave both blank.');
      return;
    }
    if (required) { setError('Complete all required origin and destination fields.'); return; }
    setSaving(true);
    try {
      const addressPayload = { origin, destination };
      if (editing) {
        const result = await updateShipment(shipment!.id, {
          ...addressPayload, serviceType, weight: weight ? Number(weight) : null,
          description: description.trim() || null, estimatedDelivery: estimatedDelivery || null,
        });
        router.push(`/admin/shipments/${result.shipment.id}?updated=1`);
      } else {
        const result = await createShipment({
          customerId: customerId.trim(), ...addressPayload, serviceType,
          ...(weight ? { weight: Number(weight) } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(estimatedDelivery ? { estimatedDelivery } : {}),
        } satisfies CreateShipmentInput);
        router.push(`/admin/shipments/${result.shipment.id}`);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 403
        ? 'You do not have permission to save shipments.'
        : requestError instanceof ApiError && requestError.status === 400
          ? Object.values(requestError.details ?? {})[0] ?? 'Please review the form and try again.'
          : 'We could not save this shipment. Please review the information and try again.');
    } finally { setSaving(false); }
  }

  const addressFields = (title: string, address: ShipmentAddressInput, setter: (value: ShipmentAddressInput) => void) => (
    <fieldset className="shipment-form-section">
      <legend>{title}</legend>
      {(['name', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country', 'latitude', 'longitude'] as const).map((field) => (
        <div key={field}><Label htmlFor={`${title}-${field}`}>{field === 'addressLine1' ? 'Address' : field === 'addressLine2' ? 'Address line 2' : field.replace(/([A-Z])/g, ' $1')}</Label><Input id={`${title}-${field}`} type={field === 'latitude' || field === 'longitude' ? 'number' : undefined} min={field === 'latitude' ? '-90' : field === 'longitude' ? '-180' : undefined} max={field === 'latitude' ? '90' : field === 'longitude' ? '180' : undefined} step={field === 'latitude' || field === 'longitude' ? 'any' : undefined} value={address[field] ?? ''} placeholder={field === 'name' ? 'Full name' : field === 'phone' ? '+1 555 000 0000' : field === 'addressLine1' ? 'Street address' : field === 'addressLine2' ? 'Apartment, suite, etc.' : field === 'city' ? 'City' : field === 'state' ? 'State or region' : field === 'postalCode' ? 'Postal code' : field === 'country' ? 'Country' : field === 'latitude' ? 'e.g. 5.6037' : 'e.g. -0.1870'} required={!['addressLine2', 'state', 'latitude', 'longitude'].includes(field)} onChange={(event) => updateAddress(setter, address, field, event.target.value)} disabled={saving} /></div>
      ))}
    </fieldset>
  );

  return <form className="shipment-form" onSubmit={submit}>
    <header className="shipment-form-heading">
      <div>
        <span className="admin-heading-kicker"><span className="admin-live-dot" /> Operations / Shipments</span>
        <h1>{editing ? 'Edit shipment' : 'Create a shipment'}</h1>
        <p>{editing ? 'Update the route, service, or delivery details for this shipment.' : 'Add the shipment details below and we will generate its tracking number automatically.'}</p>
      </div>
      <span className="auth-card-mark" aria-hidden="true">OT</span>
    </header>
    {error ? <Alert tone="danger">{error}</Alert> : null}
    <section className="shipment-form-block shipment-form-overview">
      <div className="shipment-form-block-heading"><span className="shipment-form-step">01</span><div><h2>Shipment details</h2><p>Identify the customer and choose the service level.</p></div></div>
      <div className="shipment-form-overview-fields">
        {!editing ? <div className="customer-picker"><Label htmlFor="customer-search">Customer</Label><Input id="customer-search" value={customerSearch} onChange={(event) => { setCustomerSearch(event.target.value); setCustomerId(''); }} disabled={saving} placeholder="Search by name or email" autoComplete="off" /><Select id="customer-id" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required disabled={saving || customersLoading}><option value="">{customersLoading ? 'Searching customers...' : 'Select a customer'}</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} - {customer.email}</option>)}</Select><p className="form-help">Search and select an existing customer account.</p></div> : null}
        <div><Label htmlFor="service-type">Service Type</Label><Select id="service-type" value={serviceType} onChange={(event) => setServiceType(event.target.value as ServiceType)} disabled={saving}><option value="STANDARD">Standard</option><option value="EXPRESS">Express</option><option value="OVERNIGHT">Overnight</option></Select></div>
      </div>
    </section>
    <section className="shipment-form-block">
      <div className="shipment-form-block-heading"><span className="shipment-form-step">02</span><div><h2>Route information</h2><p>Tell us where the shipment starts and where it is going.</p></div></div>
      <div className="shipment-form-addresses">{addressFields('Origin', origin, setOrigin)}{addressFields('Destination', destination, setDestination)}</div>
    </section>
    <section className="shipment-form-block shipment-form-optional">
      <div className="shipment-form-block-heading"><span className="shipment-form-step">03</span><div><h2>Delivery details <small>Optional</small></h2><p>Add useful context for your operations team.</p></div></div>
      <div className="shipment-form-optional-fields">
        <div><Label htmlFor="shipment-weight">Weight</Label><Input id="shipment-weight" type="number" min="0.01" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)} disabled={saving} placeholder="0.00" /></div>
        <div><Label htmlFor="shipment-delivery">Estimated Delivery</Label><Input id="shipment-delivery" type="date" value={estimatedDelivery} onChange={(event) => setEstimatedDelivery(event.target.value)} disabled={saving} /></div>
        <div className="shipment-form-description"><Label htmlFor="shipment-description">Description</Label><Textarea id="shipment-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} placeholder="e.g. Fragile electronics" /></div>
      </div>
    </section>
    <div className="form-actions"><button className="form-button muted-button" type="button" onClick={() => router.back()} disabled={saving}>Cancel</button><button className="form-button" type="submit" disabled={saving}>{saving ? (editing ? 'Updating...' : 'Saving...') : editing ? 'Update Shipment' : 'Create Shipment'}</button></div>
    {shipment?.trackingNumber ? <div className="created-tracking"><span>Tracking Number</span><TrackingNumber value={shipment.trackingNumber} /></div> : null}
  </form>;
}
