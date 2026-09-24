type GeocodableAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

type GeocodedAddress = GeocodableAddress & {
  latitude?: number;
  longitude?: number;
};

export async function geocodeAddress(address: GeocodableAddress): Promise<GeocodedAddress> {
  if (address.latitude !== undefined && address.longitude !== undefined) return address;

  const query = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean).join(', ');

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'OherbTracker/1.0 (shipment-geocoding)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return address;

    const results = await response.json() as Array<{ lat?: string; lon?: string }>;
    const latitude = Number(results[0]?.lat);
    const longitude = Number(results[0]?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return address;

    return { ...address, latitude, longitude };
  } catch (error) {
    console.warn('[geocoding] address lookup failed', {
      city: address.city,
      country: address.country,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return address;
  }
}
