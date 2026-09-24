'use client';

import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const StyledPolyline = Polyline as unknown as ComponentType<{
  positions: [number, number][];
  pathOptions: { color: string; dashArray: string; weight: number };
}>;

export type MapLocation = {
  label?: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

function Viewport({ locations }: { locations: MapLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 1) {
      map.fitBounds(locations.map((location) => [location.latitude, location.longitude] as [number, number]), { padding: [28, 28], maxZoom: 10 });
    } else if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 10);
    }
  }, [locations, map]);
  return null;
}

function locationName(location: MapLocation) {
  return location.label ?? ([location.city, location.country].filter(Boolean).join(', ') || 'Shipment location');
}

export function ShipmentMap({ origin, currentLocation, destination }: { origin?: MapLocation; currentLocation?: MapLocation; destination?: MapLocation }) {
  const locations = [origin, currentLocation, destination].filter((location): location is MapLocation => Boolean(location));
  if (locations.length === 0) {
    return <div className="map-fallback" role="status">Map location is not available for this shipment.</div>;
  }

  const center: [number, number] = [locations[0].latitude, locations[0].longitude];
  const line = locations.map((location) => [location.latitude, location.longitude] as [number, number]);

  return <div className="shipment-map-wrapper">
    <MapContainer className="shipment-map" center={center} zoom={10} scrollWheelZoom={false} aria-label="Shipment locations map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Viewport locations={locations} />
      {origin ? <CircleMarker center={[origin.latitude, origin.longitude]} pathOptions={{ color: '#315b3d', fillColor: '#6d936b', fillOpacity: 0.9 }} radius={9}><Popup>Origin: {locationName(origin)}</Popup></CircleMarker> : null}
      {currentLocation ? <CircleMarker center={[currentLocation.latitude, currentLocation.longitude]} pathOptions={{ color: '#b94747', fillColor: '#e97878', fillOpacity: 0.95 }} radius={10}><Popup>Current location: {locationName(currentLocation)}</Popup></CircleMarker> : null}
      {destination ? <CircleMarker center={[destination.latitude, destination.longitude]} pathOptions={{ color: '#164a34', fillColor: '#b8d6bd', fillOpacity: 0.9 }} radius={9}><Popup>Destination: {locationName(destination)}</Popup></CircleMarker> : null}
      {line.length > 1 ? <StyledPolyline positions={line} pathOptions={{ color: '#6d936b', dashArray: '6 8', weight: 3 }} /> : null}
    </MapContainer>
    <div className="map-legend" aria-label="Map legend">
      {origin ? <span><i className="map-key origin-key" />Origin</span> : null}
      {currentLocation ? <span><i className="map-key current-key" />Current location</span> : null}
      {destination ? <span><i className="map-key destination-key" />Destination</span> : null}
    </div>
    {line.length > 1 ? <p className="map-note">Dashed line shows the shipment sequence, not a road route.</p> : null}
  </div>;
}
