// lib/geo/cityCoords.ts — city-name → lat/lng lookup for map surfaces that
// only have a venue city string (the timeline payload carries no coordinates).
// Keys are bare lowercase city names; lookups strip a trailing ", XX"
// state/country suffix so both "Austin" and "Austin, TX" resolve. Covers the
// cities seeded server-side plus common touring stops — unknown cities return
// null and callers simply skip them (no dot beats a wrong dot).

export type CityCoords = { lat: number; lng: number };

const CITY_COORDS: Record<string, CityCoords> = {
  atlanta: { lat: 33.749, lng: -84.388 },
  austin: { lat: 30.267, lng: -97.743 },
  boston: { lat: 42.36, lng: -71.058 },
  brooklyn: { lat: 40.678, lng: -73.944 },
  chicago: { lat: 41.878, lng: -87.63 },
  dallas: { lat: 32.777, lng: -96.797 },
  denver: { lat: 39.739, lng: -104.99 },
  detroit: { lat: 42.331, lng: -83.046 },
  'east rutherford': { lat: 40.834, lng: -74.097 },
  george: { lat: 47.079, lng: -119.854 }, // The Gorge Amphitheatre
  houston: { lat: 29.76, lng: -95.37 },
  inglewood: { lat: 33.962, lng: -118.353 },
  'las vegas': { lat: 36.17, lng: -115.14 },
  'los angeles': { lat: 34.052, lng: -118.244 },
  miami: { lat: 25.762, lng: -80.192 },
  minneapolis: { lat: 44.978, lng: -93.265 },
  morrison: { lat: 39.654, lng: -105.191 }, // Red Rocks
  nashville: { lat: 36.163, lng: -86.781 },
  'new orleans': { lat: 29.951, lng: -90.072 },
  'new york': { lat: 40.713, lng: -74.006 },
  philadelphia: { lat: 39.953, lng: -75.164 },
  phoenix: { lat: 33.448, lng: -112.074 },
  portland: { lat: 45.515, lng: -122.678 },
  'san diego': { lat: 32.716, lng: -117.161 },
  'san francisco': { lat: 37.775, lng: -122.419 },
  seattle: { lat: 47.606, lng: -122.332 },
  washington: { lat: 38.907, lng: -77.037 },
  montreal: { lat: 45.502, lng: -73.567 },
  toronto: { lat: 43.653, lng: -79.383 },
  vancouver: { lat: 49.283, lng: -123.121 },
  'mexico city': { lat: 19.433, lng: -99.133 },
  amsterdam: { lat: 52.368, lng: 4.904 },
  barcelona: { lat: 41.387, lng: 2.17 },
  berlin: { lat: 52.52, lng: 13.405 },
  dublin: { lat: 53.349, lng: -6.26 },
  london: { lat: 51.507, lng: -0.128 },
  madrid: { lat: 40.417, lng: -3.704 },
  paris: { lat: 48.857, lng: 2.352 },
  'sao paulo': { lat: -23.551, lng: -46.633 },
  sydney: { lat: -33.868, lng: 151.209 },
  tokyo: { lat: 35.677, lng: 139.65 },
};

/** Bare display name — "Austin, TX" → "Austin". */
export function cityDisplayName(city: string): string {
  return city.split(',')[0]!.trim();
}

export function cityCoordsFor(city: string): CityCoords | null {
  const key = cityDisplayName(city).toLowerCase();
  return CITY_COORDS[key] ?? null;
}
