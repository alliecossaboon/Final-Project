import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs"
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function isSupabaseConfigured() {
  return (
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.startsWith("http") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY.length > 20
  );
}

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("searches")
      .select("id, query, from_iata, to_iata, distance_km, co2_per_pax_kg, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch searches",
        detail: error.message
      });
    }

    return res.status(200).json(data || []);
  }

  if (req.method === "POST") {
    const body = req.body || {};

    const row = {
      query: String(body.query || "").trim(),
      from_iata: body.from ? String(body.from) : null,
      to_iata: body.to ? String(body.to) : null,
      distance_km: Number.isFinite(Number(body.distance_km))
        ? Number(body.distance_km)
        : null,
      co2_per_pax_kg: Number.isFinite(Number(body.co2_per_pax_kg))
        ? Number(body.co2_per_pax_kg)
        : null
    };

    if (!row.query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const { data, error } = await supabase
      .from("searches")
      .insert(row)
      .select("id, query, from_iata, to_iata, distance_km, co2_per_pax_kg, created_at")
      .single();

    if (error) {
      return res.status(500).json({
        error: "Failed to insert search",
        detail: error.message
      });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
