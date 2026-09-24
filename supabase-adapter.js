(() => {
  "use strict";

  const config = window.AGUAFLOW_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && config.mode === "supabase");
  let clientPromise = null;
  let realtimeChannel = null;

  function jsonHeaders(extra = {}) {
    return { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}`, "Content-Type": "application/json", ...extra };
  }

  async function getClient() {
    if (!configured) throw new Error("Supabase no configurado; se usará el modo local.");
    if (!window.supabase?.createClient) throw new Error("No se pudo cargar Supabase JS. Revisá la conexión o el CDN.");
    if (!clientPromise) {
      clientPromise = Promise.resolve(window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
    }
    return clientPromise;
  }

  async function queryAll(table, select = "*", apply) {
    const client = await getClient();
    let query = client.from(table).select(select);
    if (typeof apply === "function") query = apply(query) || query;
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    return data || [];
  }

  async function loadSnapshot(serviceDate) {
    const client = await getClient();
    const date = serviceDate || new Date().toISOString().slice(0, 10);
    const [profile, clients, products, prices, routes, routeStops, runs, vehicles, stockBalances, movements] = await Promise.all([
      queryAll("profiles", "id, business_id, role, full_name, phone, active").then((rows) => rows[0] || null),
      queryAll("clients", "*"),
      queryAll("products", "*"),
      queryAll("prices", "*"),
      queryAll("weekly_routes", "*"),
      queryAll("weekly_route_stops", "*"),
      queryAll("daily_runs", "*"),
      queryAll("vehicles", "*"),
      queryAll("stock_balances", "*"),
      queryAll("stock_movements", "*").then((rows) => rows.slice(0, 30)),
    ]);
    const currentRun = runs.filter((run) => run.service_date === date).sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)))[0] || null;
    let stops = [];
    let orders = [];
    let orderItems = [];
    let messageJobs = [];
    if (currentRun) {
      stops = await queryAll("daily_stops", "*", (query) => query.eq("run_id", currentRun.id));
      const stopIds = stops.map((stop) => stop.id);
      if (stopIds.length) {
        orders = await queryAll("orders", "*", (query) => query.in("stop_id", stopIds));
        const orderIds = orders.map((order) => order.id);
        if (orderIds.length) orderItems = await queryAll("order_items", "*", (query) => query.in("order_id", orderIds));
        messageJobs = await queryAll("message_jobs", "*", (query) => query.eq("run_id", currentRun.id));
      }
    }
    return { profile, clients, products, prices, routes, routeStops, runs, currentRun, stops, orders, orderItems, messageJobs, vehicles, stockBalances, movements, session: (await client.auth.getSession()).data.session };
  }

  async function getSession() {
    if (!configured) return { session: null, error: null };
    try {
      const client = await getClient();
      return await client.auth.getSession();
    } catch (error) {
      return { session: null, error };
    }
  }

  async function signIn(email, password) {
    const client = await getClient();
    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    const client = await getClient();
    return client.auth.signOut();
  }

  async function generateDailyRun(serviceDate) {
    const client = await getClient();
    return client.rpc("generate_daily_runs", { p_service_date: serviceDate, p_business_id: config.businessId });
  }

  async function subscribe(onChange) {
    if (!configured) return () => {};
    const client = await getClient();
    realtimeChannel = client.channel(`aguaflow-live-${Date.now()}`);
    ["clients", "daily_runs", "daily_stops", "orders", "order_items", "message_jobs", "stock_balances", "prices"].forEach((table) => {
      realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => onChange({ table, payload }));
    });
    realtimeChannel.subscribe();
    return () => { if (realtimeChannel) client.removeChannel(realtimeChannel); realtimeChannel = null; };
  }

  async function findProduct(productIdOrCode) {
    const client = await getClient();
    const query = client.from("products").select("id, code, name");
    const { data, error } = await (productIdOrCode ? query.eq("id", productIdOrCode) : query.eq("code", productIdOrCode));
    if (error) throw new Error(error.message);
    return data?.[0] || null;
  }

  async function upsertClient(payload) {
    const client = await getClient();
    const { data: clientRow, error } = await client.from("clients").upsert({ ...(payload.remoteId ? { id: payload.remoteId } : {}), business_id: config.businessId, full_name: payload.name, phone_e164: payload.phone, address: payload.address, access_notes: payload.notes || "", whatsapp_opt_in: payload.whatsappOptIn !== false, driver_id: payload.driverRemoteId || null, source_ref: "app" }, { onConflict: "business_id,phone_e164" }).select("id, full_name").single();
    if (error) throw new Error(error.message);
    if (payload.defaultOrder) {
      const products = await queryAll("products", "id, code");
      const byCode = Object.fromEntries(products.map((product) => [product.code, product.id]));
      await client.from("client_default_items").delete().eq("client_id", clientRow.id);
      const rows = [["W20", payload.defaultOrder.water20], ["W12", payload.defaultOrder.water12], ["SODA", payload.defaultOrder.soda]].filter(([, quantity]) => Number(quantity) > 0).map(([code, quantity]) => ({ client_id: clientRow.id, product_id: byCode[code], quantity: Number(quantity) }));
      if (rows.length) await client.from("client_default_items").insert(rows);
    }
    if (payload.days) {
      for (const day of payload.days) {
        const weekday = { lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6 }[day];
        if (!weekday) continue;
        const { data: route } = await client.from("weekly_routes").select("id").eq("business_id", config.businessId).eq("weekday", weekday).eq("active", true).maybeSingle();
        if (route) {
          await client.from("weekly_route_stops").delete().eq("route_id", route.id).eq("client_id", clientRow.id);
          await client.from("weekly_route_stops").insert({ route_id: route.id, client_id: clientRow.id, position: 999, active: true });
        }
      }
    }
    return clientRow;
  }

  async function applyOperation(operation) {
    if (!configured) return { ok: true, mode: "local" };
    const client = await getClient();
    const payload = operation.payload || {};
    switch (operation.type) {
      case "create_client":
      case "update_client":
        await upsertClient(payload);
        return { ok: true };
      case "import_clients":
        for (const row of payload.rows || []) await upsertClient(row);
        return { ok: true };
      case "generate_daily_route":
        return client.rpc("generate_daily_runs", { p_service_date: payload.serviceDate, p_business_id: config.businessId });
      case "update_stop_status": {
        const confirmation = payload.status === "declined" ? "declined" : payload.status === "modified" ? "modified" : payload.status === "rescheduled" ? "reschedule_requested" : "confirmed";
        await client.from("daily_stops").update({ confirmation_status: confirmation, whatsapp_last_message_at: new Date().toISOString() }).eq("id", payload.remoteStopId);
        await client.from("orders").update({ status: payload.status === "declined" ? "cancelled" : payload.status === "confirmed" ? "ready" : "draft" }).eq("stop_id", payload.remoteStopId);
        return { ok: true };
      }
      case "update_order_item": {
        const { data: order } = await client.from("orders").select("id").eq("stop_id", payload.remoteStopId).single();
        if (!order) return { ok: false };
        await client.from("order_items").upsert({ order_id: order.id, product_id: payload.remoteProductId, quantity_requested: Number(payload.quantity || 0) }, { onConflict: "order_id,product_id" });
        return { ok: true };
      }
      case "register_delivery":
        return client.rpc("register_delivery", { p_operation_id: operation.id, p_stop_id: payload.remoteStopId, p_items: payload.items || [], p_business_id: config.businessId });
      case "update_prices": {
        const products = await queryAll("products", "id, code");
        const rows = Object.entries(payload.prices || {}).map(([code, price]) => ({ business_id: config.businessId, product_id: products.find((product) => ({ water20: "W20", water12: "W12", soda: "SODA" }[code]) === product.code)?.id, unit_price: Number(price), currency: "ARS", valid_from: new Date().toISOString().slice(0, 10) })).filter((row) => row.product_id);
        if (rows.length) await client.from("prices").insert(rows);
        return { ok: true };
      }
      case "create_reschedule_request":
        await client.from("reschedule_requests").insert({ business_id: config.businessId, original_stop_id: payload.remoteStopId, requested_date: payload.requestedDate, reason: payload.reason || "Solicitud desde la app" });
        return { ok: true };
      case "adjust_stock":
      case "stock_movement": {
        const product = await findProduct(payload.productKey);
        if (product && payload.vehicleRemoteId) {
          const { data: balance } = await client.from("stock_balances").select("on_hand").eq("vehicle_id", payload.vehicleRemoteId).eq("product_id", product.id).maybeSingle();
          const delta = operation.type === "adjust_stock" ? Number(payload.delta || 0) : Number(payload.quantity || 0);
          await client.from("stock_balances").update({ on_hand: Math.max(0, Number(balance?.on_hand || 0) + delta), updated_at: new Date().toISOString() }).eq("vehicle_id", payload.vehicleRemoteId).eq("product_id", product.id);
        }
        return { ok: true };
      }
      default:
        return { ok: true, ignored: true };
    }
  }

  async function pushOperation(operation) {
    if (!configured) return { queued: true, mode: "local" };
    const client = await getClient();
    const { error } = await client.from("sync_operations").upsert({ business_id: config.businessId, operation_id: operation.id, operation_type: operation.type, payload: operation.payload, status: "pending" }, { onConflict: "business_id,operation_id" });
    if (error) return { queued: false, error };
    const result = await applyOperation(operation);
    await client.from("sync_operations").update({ status: "synced", processed_at: new Date().toISOString(), error_message: null }).eq("business_id", config.businessId).eq("operation_id", operation.id);
    return { queued: true, result };
  }

  window.aguaflowSupabase = { configured, mode: configured ? "supabase" : "local", getClient, loadSnapshot, getSession, signIn, signOut, generateDailyRun, subscribe, applyOperation, pushOperation };
})();
