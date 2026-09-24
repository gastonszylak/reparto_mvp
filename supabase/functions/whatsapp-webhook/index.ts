import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function stableAction(message: Record<string, unknown>) {
  const interactive = message.interactive as Record<string, unknown> | undefined;
  const buttonReply = interactive?.button_reply as Record<string, unknown> | undefined;
  const listReply = interactive?.list_reply as Record<string, unknown> | undefined;
  const raw = String(buttonReply?.id || listReply?.id || message.text || "").trim().toLowerCase();
  if (["confirm_default", "confirm", "sí", "si", "yes", "1"].includes(raw)) return "CONFIRM_DEFAULT";
  if (["decline", "no", "0"].includes(raw)) return "DECLINE";
  if (["modify", "modificar", "2"].includes(raw)) return "MODIFY";
  if (["reschedule", "reprogramar"].includes(raw)) return "RESCHEDULE";
  return "UNKNOWN";
}

function nextBusinessDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function validSignature(rawBody: string, signature: string | null) {
  const secret = Deno.env.get("META_APP_SECRET");
  if (!secret) return Deno.env.get("REQUIRE_SIGNATURE") !== "true";
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}` === signature;
}

function dayForTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") || "";
    if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) return new Response(challenge, { headers: corsHeaders });
    return response({ error: "verification_failed" }, 403);
  }

  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const rawBody = await request.text();
  if (!(await validSignature(rawBody, request.headers.get("x-hub-signature-256")))) return response({ error: "invalid_signature" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response({ error: "invalid_json" }, 400);
  }

  const entries = (payload.entry || []) as Array<Record<string, unknown>>;
  for (const entry of entries) {
    const changes = (entry.changes || []) as Array<Record<string, unknown>>;
    for (const change of changes) {
      const value = (change.value || {}) as Record<string, unknown>;
      const messages = (value.messages || []) as Array<Record<string, unknown>>;
      for (const message of messages) {
        const providerMessageId = String(message.id || "");
        const from = String(message.from || "");
        if (!providerMessageId || !from) continue;

        const { data: existingMessage } = await supabase.from("whatsapp_messages").select("id").eq("provider_message_id", providerMessageId).maybeSingle();
        if (existingMessage) continue;

        const action = stableAction(message);
        const { data: client } = await supabase.from("clients").select("id, business_id, whatsapp_contact_id").or(`whatsapp_contact_id.eq.${from},phone_e164.eq.+${from}`).limit(1).maybeSingle();
        if (!client) continue;

        const { data: thread } = await supabase.from("whatsapp_threads").upsert({ business_id: client.business_id, client_id: client.id, whatsapp_contact_id: from, last_message_at: new Date().toISOString() }, { onConflict: "business_id,whatsapp_contact_id" }).select("id").single();
        await supabase.from("whatsapp_messages").insert({ thread_id: thread.id, provider_message_id: providerMessageId, direction: "inbound", message_type: String(message.type || "text"), stable_action: action, raw_payload: message, received_at: new Date().toISOString(), processed_at: new Date().toISOString() });

        const { data: business } = await supabase.from("businesses").select("timezone").eq("id", client.business_id).single();
        const serviceDate = dayForTimezone(business?.timezone || "UTC");
        const { data: job } = await supabase.from("message_jobs").select("id, stop_id, status").eq("client_id", client.id).eq("service_date", serviceDate).in("status", ["pending", "sending", "sent"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!job) continue;

        const confirmationStatus = action === "CONFIRM_DEFAULT" ? "confirmed" : action === "DECLINE" ? "declined" : action === "MODIFY" ? "modified" : action === "RESCHEDULE" ? "reschedule_requested" : null;
        if (confirmationStatus) {
          await supabase.from("daily_stops").update({ confirmation_status: confirmationStatus, whatsapp_last_message_at: new Date().toISOString() }).eq("id", job.stop_id);
          await supabase.from("orders").update({ status: action === "DECLINE" ? "cancelled" : action === "CONFIRM_DEFAULT" ? "ready" : "draft", confirmed_at: action === "CONFIRM_DEFAULT" ? new Date().toISOString() : null }).eq("stop_id", job.stop_id);
        }
        if (action === "RESCHEDULE") {
          await supabase.from("reschedule_requests").insert({ business_id: client.business_id, original_stop_id: job.stop_id, requested_date: nextBusinessDate(), reason: "Respuesta de WhatsApp", status: "requested" });
        }
        await supabase.from("message_jobs").update({ status: "replied", replied_at: new Date().toISOString(), provider_message_id: providerMessageId }).eq("id", job.id);
      }
    }
  }

  return response({ ok: true });
});
