import type { LocationOption } from "./types";

export const PRESET_LOCATIONS: LocationOption[] = [
  {
    id: "preset-kolkata",
    name: "Kolkata",
    admin1: "West Bengal",
    country: "India",
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: "Asia/Kolkata",
    isPreset: true,
  },
  {
    id: "preset-delhi",
    name: "Delhi",
    admin1: "Delhi",
    country: "India",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
    isPreset: true,
  },
  {
    id: "preset-mumbai",
    name: "Mumbai",
    admin1: "Maharashtra",
    country: "India",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    isPreset: true,
  },
  {
    id: "preset-bengaluru",
    name: "Bengaluru",
    admin1: "Karnataka",
    country: "India",
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: "Asia/Kolkata",
    isPreset: true,
  },
  {
    id: "preset-chennai",
    name: "Chennai",
    admin1: "Tamil Nadu",
    country: "India",
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: "Asia/Kolkata",
    isPreset: true,
  },
];

export const DEFAULT_LOCATION: LocationOption = PRESET_LOCATIONS[0];

export function formatLocationLabel(location: LocationOption): string {
  const parts = [location.name];
  if (location.admin1 && location.admin1 !== location.name) {
    parts.push(location.admin1);
  }
  if (location.country) {
    parts.push(location.country);
  }
  return parts.join(", ");
}
