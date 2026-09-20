'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, createShipment, updateShipment, type CreateShipmentInput, type Shipment, type ShipmentAddressInput, type ServiceType } from '../../lib/api-client';
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
  const [serviceType, setServiceType] = useState<ServiceType>((shipment?.serviceType as ServiceType) ?? 'STANDARD');
  const [origin, setOrigin] = useState<ShipmentAddressInput>(initialAddress(shipment?.origin));
  const [destination, setDestination] = useState<ShipmentAddressInput>(initialAddress(shipment?.destination));
  const [weight, setWeight] = useState(shipment?.weight?.toString() ?? '');
  const [description, setDescription] = useState(shipment?.description ?? '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(shipment?.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().slice(0, 10) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateAddress(setter: (value: ShipmentAddressInput) => void, address: ShipmentAddressInput, field: keyof ShipmentAddressInput, value: string) {
    setter({ ...address, [field]: value });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!editing && !customerId.trim()) { setError('Customer ID is required.'); return; }
    const requiredFields = (address: ShipmentAddressInput) => [
      address.name,
      address.phone,
      address.addressLine1,
      address.city,
      address.postalCode,
      address.country,
    ];
    const required = [...requiredFields(origin), ...requiredFields(destination)].some((value) => !value.trim());
    if (required) { setError('Complete all required origin and destination fields.'); return; }
    setSaving(true);
    try {
      const addressPayload = { origin, destination };
      if (editing) {
        const result = await updateShipment(shipment!.id, {
          ...addressPayload, serviceType, weight: weight ? Number(weight) : null,
          description: description.trim() || null, estimatedDelivery: estimatedDelivery || null,
        });
        router.push(`/admin/shipments/${result.shipment.id}`);
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
      {(['name', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country'] as const).map((field) => (
        <div key={field}><Label htmlFor={`${title}-${field}`}>{field === 'addressLine1' ? 'Address' : field === 'addressLine2' ? 'Address line 2' : field.replace(/([A-Z])/g, ' $1')}</Label><Input id={`${title}-${field}`} value={address[field] ?? ''} required={!['addressLine2', 'state'].includes(field)} onChange={(event) => updateAddress(setter, address, field, event.target.value)} disabled={saving} /></div>
      ))}
    </fieldset>
  );

  return <form className="shipment-form" onSubmit={submit}>
    <h2>{editing ? 'Edit Shipment' : 'Create Shipment'}</h2>
    {error ? <Alert tone="danger">{error}</Alert> : null}
    {!editing ? <div><Label htmlFor="customer-id">Customer ID</Label><Input id="customer-id" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required disabled={saving} placeholder="Customer account ID" /><p className="form-help">Enter the ID of an existing customer account. Tracking numbers are generated automatically.</p></div> : null}
    <div><Label htmlFor="service-type">Service Type</Label><Select id="service-type" value={serviceType} onChange={(event) => setServiceType(event.target.value as ServiceType)} disabled={saving}><option value="STANDARD">Standard</option><option value="EXPRESS">Express</option><option value="OVERNIGHT">Overnight</option></Select></div>
    <div className="shipment-form-addresses">{addressFields('Origin', origin, setOrigin)}{addressFields('Destination', destination, setDestination)}</div>
    <div><Label htmlFor="shipment-weight">Weight</Label><Input id="shipment-weight" type="number" min="0.01" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)} disabled={saving} /></div>
    <div><Label htmlFor="shipment-delivery">Estimated Delivery</Label><Input id="shipment-delivery" type="date" value={estimatedDelivery} onChange={(event) => setEstimatedDelivery(event.target.value)} disabled={saving} /></div>
    <div><Label htmlFor="shipment-description">Description</Label><Textarea id="shipment-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} /></div>
    <div className="form-actions"><button className="form-button muted-button" type="button" onClick={() => router.back()} disabled={saving}>Cancel</button><button className="form-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Shipment'}</button></div>
    {shipment?.trackingNumber ? <div className="created-tracking"><span>Tracking Number</span><TrackingNumber value={shipment.trackingNumber} /></div> : null}
  </form>;
}
