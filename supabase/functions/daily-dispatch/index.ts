import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
const dryRun = Deno.env.get("WHATSAPP_DRY_RUN") !== "false";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function localDate(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function sendTemplate(phone: string, clientName: string, serviceDate: string) {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const template = Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "daily_order_question";
  if (!token || !phoneNumberId) throw new Error("Faltan credenciales de WhatsApp");
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: template,
        language: { code: "es" },
        components: [{ type: "body", parameters: [{ type: "text", text: clientName }, { type: "text", text: serviceDate }] }],
      },
    }),
  });
  if (!response.ok) throw new Error(`Meta ${response.status}: ${await response.text()}`);
  return response.json();
}

Deno.serve(async () => {
  const { data: businesses } = await supabase.from("businesses").select("id, timezone").eq("active", true);
  const result: Array<Record<string, unknown>> = [];
  for (const business of businesses || []) {
    const serviceDate = localDate(business.timezone || "UTC");
    const { data: runs } = await supabase.from("daily_runs").select("id").eq("business_id", business.id).eq("service_date", serviceDate).in("status", ["planned", "active"]);
    for (const run of runs || []) {
      const { data: stops } = await supabase.from("daily_stops").select("id, client_id, confirmation_status").eq("run_id", run.id).in("confirmation_status", ["pending", "no_answer", "reschedule_requested"]);
      for (const stop of stops || []) {
        const { data: client } = await supabase.from("clients").select("id, full_name, phone_e164, whatsapp_opt_in").eq("id", stop.client_id).single();
        if (!client?.whatsapp_opt_in || !client.phone_e164) continue;
        const idempotencyKey = `${stop.id}:daily_consultation:1`;
        const { data: existing } = await supabase.from("message_jobs").select("id").eq("business_id", business.id).eq("idempotency_key", idempotencyKey).maybeSingle();
        if (existing) continue;
        const { data: job } = await supabase.from("message_jobs").insert({ business_id: business.id, run_id: run.id, stop_id: stop.id, client_id: client.id, service_date: serviceDate, kind: "daily_consultation", template_key: "daily_order_question", status: "pending", idempotency_key: idempotencyKey, scheduled_at: new Date().toISOString() }).select("id").single();
        if (!job) continue;
        if (dryRun) {
          result.push({ jobId: job.id, status: "dry_run", client: client.full_name });
          continue;
        }
        try {
          const sent = await sendTemplate(client.phone_e164, client.full_name, serviceDate);
          const providerId = sent.messages?.[0]?.id || null;
          await supabase.from("message_jobs").update({ status: "sent", attempts: 1, provider_message_id: providerId, sent_at: new Date().toISOString() }).eq("id", job.id);
          result.push({ jobId: job.id, status: "sent", client: client.full_name });
        } catch (error) {
          await supabase.from("message_jobs").update({ status: "failed", attempts: 1, last_error: String(error) }).eq("id", job.id);
          result.push({ jobId: job.id, status: "failed", client: client.full_name, error: String(error) });
        }
      }
    }
  }
  return json({ dryRun, processed: result.length, jobs: result });
});
