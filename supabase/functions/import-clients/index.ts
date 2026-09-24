import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } }); }
function normalizePhone(value: unknown) { return String(value || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, ""); }
function normalizeDay(value: unknown) {
  const key = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ({ lun: "lunes", lunes: "lunes", mar: "martes", martes: "martes", miercoles: "miércoles", mie: "miércoles", jueves: "jueves", jue: "jueves", viernes: "viernes", vie: "viernes", sabado: "sábado", sab: "sábado" } as Record<string, string>)[key] || "";
}
function weekdayNumber(day: string) { return ({ lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6 } as Record<string, number>)[day] || 0; }

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = request.headers.get("Authorization");
  if (!auth) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return json({ error: "unauthorized" }, 401);
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await adminClient.from("profiles").select("business_id, role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin") return json({ error: "admin_required" }, 403);
  let body: { rows?: Array<Record<string, unknown>> };
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const errors: Array<{ row: number; message: string }> = [];
  let inserted = 0;
  let updated = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const fullName = String(row.name || row.nombre || "").trim();
    const phone = normalizePhone(row.phone || row.telefono);
    const address = String(row.address || row.direccion || "").trim();
    const days = Array.isArray(row.days) ? row.days : String(row.day || row.dia || "").split(/[;,|/]+/).map(normalizeDay).filter(Boolean);
    const quantities = { water20: Number(row.water20 ?? row.bidon20 ?? 0), water12: Number(row.water12 ?? row.bidon12 ?? 0), soda: Number(row.soda ?? row.sifon ?? 0) };
    if (!fullName || !phone || !address || !days.length || Object.values(quantities).some((value) => !Number.isInteger(value) || value < 0)) { errors.push({ row: index + 2, message: "Datos inválidos" }); continue; }
    const optInValue = String(row.whatsappOptIn ?? row.whatsapp ?? "true").trim().toLowerCase();
    const whatsappOptIn = ["1", "true", "si", "sí", "yes"].includes(optInValue);
    const { data: existing } = await adminClient.from("clients").select("id").eq("business_id", profile.business_id).eq("phone_e164", phone).maybeSingle();
    const { data: client, error: clientError } = await adminClient.from("clients").upsert({ business_id: profile.business_id, full_name: fullName, phone_e164: phone, address, access_notes: String(row.notes || ""), whatsapp_opt_in: whatsappOptIn, source_ref: String(row.sourceRef || "csv") }, { onConflict: "business_id,phone_e164" }).select("id").single();
    if (clientError || !client) { errors.push({ row: index + 2, message: clientError?.message || "No se pudo guardar cliente" }); continue; }
    existing ? updated++ : inserted++;
    const { data: products } = await adminClient.from("products").select("id, code").eq("business_id", profile.business_id);
    const productByCode = Object.fromEntries((products || []).map((product) => [product.code, product.id]));
    await adminClient.from("client_default_items").delete().eq("client_id", client.id);
    const defaults = [["W20", quantities.water20], ["W12", quantities.water12], ["SODA", quantities.soda]].filter(([, quantity]) => Number(quantity) > 0).map(([code, quantity]) => ({ client_id: client.id, product_id: productByCode[String(code)], quantity: Number(quantity) }));
    if (defaults.length) await adminClient.from("client_default_items").insert(defaults);
    for (const day of days) {
      const weekday = weekdayNumber(day);
      if (!weekday) continue;
      const { data: route } = await adminClient.from("weekly_routes").select("id").eq("business_id", profile.business_id).eq("weekday", weekday).eq("active", true).maybeSingle();
      const routeId = route?.id || (await adminClient.from("weekly_routes").insert({ business_id: profile.business_id, weekday, name: `Ruta ${day}`, active: true }).select("id").single()).data?.id;
      if (routeId) await adminClient.from("weekly_route_stops").insert({ route_id: routeId, client_id: client.id, position: index + 1, active: true });
    }
  }
  return json({ inserted, updated, errors });
});
