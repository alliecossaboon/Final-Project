export const config = {
  runtime: "nodejs"
};

const EMISSIONS_FACTOR = 0.11;
const AIRPORTS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const SERVER_VERSION = "2025-VERCEL-API-SCORE-1";

let airportMapPromise = null;

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

async function loadAirportMap() {
  if (airportMapPromise) return airportMapPromise;

  airportMapPromise = (async () => {
    const resp = await fetch(AIRPORTS_CSV_URL);
    if (!resp.ok) throw new Error("Failed to load airports dataset");

    const text = await resp.text();
    const lines = text.split("\n").filter((x) => x.trim().length > 0);

    const header = parseCsvLine(lines[0]);
    const idxIata = header.indexOf("iata_code");
    const idxName = header.indexOf("name");
    const idxLat = header.indexOf("latitude_deg");
    const idxLon = header.indexOf("longitude_deg");

    if (idxIata < 0 || idxName < 0 || idxLat < 0 || idxLon < 0) {
      throw new Error("Unexpected airports CSV format");
    }

    const map = new Map();

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length <= Math.max(idxIata, idxName, idxLat, idxLon)) continue;

      const iata = String(cols[idxIata] || "").toUpperCase().trim();
      if (!iata) continue;

      const name = String(cols[idxName] || "").trim();
      const lat = Number(cols[idxLat]);
      const lon = Number(cols[idxLon]);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (!map.has(iata)) map.set(iata, { iata, name, lat, lon });
    }

    return map;
  })();

  return airportMapPromise;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseRoute(query) {
  const m = String(query || "")
    .toUpperCase()
    .match(/\b([A-Z]{3})\b\s*(?:TO| )\s*\b([A-Z]{3})\b|\b([A-Z]{3})\b\s*-\s*\b([A-Z]{3})\b/);

  if (!m) return null;

  const from = (m[1] || m[3] || "").trim();
  const to = (m[2] || m[4] || "").trim();

  if (!from || !to) return null;
  if (from === to) return null;

  return { from, to };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query } = req.body || {};
    const route = parseRoute(query);

    if (!route) {
      return res.status(400).json({ error: "Enter a route like LAX to JFK or LAX-JFK" });
    }

    const map = await loadAirportMap();

    const dep = map.get(route.from);
    const arr = map.get(route.to);

    if (!dep || !arr) {
      return res.status(404).json({
        error: "Airport not found",
        detail: { from: route.from, to: route.to }
      });
    }

    const distanceKm = haversineKm(dep.lat, dep.lon, arr.lat, arr.lon);
    const distanceKmRounded = Math.round(distanceKm);
    const co2 = Math.round(distanceKm * EMISSIONS_FACTOR * 10) / 10;

    return res.status(200).json({
      server_version: SERVER_VERSION,
      query: String(query || "").trim(),
      from: dep.iata,
      to: arr.iata,
      departure_airport: dep.name,
      arrival_airport: arr.name,
      dep_lat: dep.lat,
      dep_lon: dep.lon,
      arr_lat: arr.lat,
      arr_lon: arr.lon,
      distance_km: distanceKmRounded,
      co2_per_pax_kg: co2,
      emissions_factor_kg_per_pax_km: EMISSIONS_FACTOR,
      source: "OurAirports airports.csv coordinates, haversine distance"
    });
  } catch (e) {
    return res.status(500).json({
      error: "Server error",
      detail: String(e && e.message ? e.message : e)
    });
  }
}
