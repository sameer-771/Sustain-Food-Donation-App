import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let configured = false;

const createPinIcon = (color: string): L.DivIcon =>
  L.divIcon({
    className: '',
    html: `<div style="position:relative;width:22px;height:22px;background:${color};border:2px solid #ffffff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,0.28);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });

export const listingMarkerIcon = createPinIcon('#ef4444');
export const selectedLocationMarkerIcon = createPinIcon('#16a34a');

export const userLocationMarkerIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid #ffffff;box-shadow:0 0 0 8px rgba(37,99,235,0.28);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -8],
});

export const configureLeafletDefaultIcons = (): void => {
  const runtimeWindow = globalThis.window;
  if (configured || runtimeWindow === undefined) {
    return;
  }

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });

  configured = true;
};
