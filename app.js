(() => {
  "use strict";

  const STORAGE_KEY = "aguaflow-demo-v1";

  const PRODUCT_META = {
    water20: { name: "Bidón 20 L", short: "20 L", unit: "bidón", icon: "💧", tone: "water20", initialPrice: 8500 },
    water12: { name: "Bidón 12 L", short: "12 L", unit: "bidón", icon: "🫗", tone: "water12", initialPrice: 6200 },
    soda: { name: "Sifón de soda", short: "Soda", unit: "sifón", icon: "🥤", tone: "soda", initialPrice: 4800 },
  };

  const STATUS_META = {
    confirmed: { label: "Confirmado", className: "status-confirmed" },
    modified: { label: "Modificado", className: "status-confirmed" },
    pending: { label: "Pendiente", className: "status-pending" },
    no_answer: { label: "Sin respuesta", className: "status-no_answer" },
    delivered: { label: "Entregado", className: "status-delivered" },
    declined: { label: "Sin pedido", className: "status-declined" },
    rescheduled: { label: "Reprogramado", className: "status-rescheduled" },
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function icon(name) {
    return `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(dateValue, options) {
    const date = typeof dateValue === "string" ? new Date(`${dateValue}T12:00:00`) : dateValue;
    return new Intl.DateTimeFormat("es-ES", options).format(date);
  }

  function longDate(dateValue) {
    const value = formatDate(dateValue, { weekday: "long", day: "numeric", month: "long" });
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function shortDate(dateValue) {
    const value = formatDate(dateValue, { weekday: "short", day: "numeric", month: "short" });
    return value.replace(".", "").charAt(0).toUpperCase() + value.replace(".", "").slice(1);
  }

  function money(value) {
    return `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.max(0, Number(value) || 0))}`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createInitialState() {
    const prices = Object.fromEntries(Object.entries(PRODUCT_META).map(([key, product]) => [key, product.initialPrice]));
    const initialState = {
      schemaVersion: 2,
      routeDate: todayISO(),
      routeName: "Ruta Norte",
      routeCode: "R-08",
      driver: { name: "Luis Sánchez", initials: "LS" },
      drivers: [{ id: "driver-luis", name: "Luis Sánchez", initials: "LS", active: true }],
      role: "admin",
      prices,
      remoteProducts: {},
      vehicleRemoteId: null,
      stock: { water20: 34, water12: 18, soda: 12 },
      reserved: { water20: 8, water12: 4, soda: 3 },
      isOffline: false,
      notificationsEnabled: true,
      stops: [
        {
          id: 1,
          position: 1,
          name: "María López",
          initials: "ML",
          avatar: "avatar-teal",
          address: "Av. Siempre Viva 742",
          phone: "+54 11 5555 0101",
          status: "confirmed",
          lastMessage: "Respondió por WhatsApp",
          note: "Portón azul. Llamar al timbre 2B.",
          order: { water20: 1, water12: 0, soda: 0 },
          priceSnapshot: { ...prices },
        },
        {
          id: 2,
          position: 2,
          name: "José Ramírez",
          initials: "JR",
          avatar: "avatar-blue",
          address: "Calle Junín 1840",
          phone: "+54 11 5555 0102",
          status: "confirmed",
          lastMessage: "Confirmó pedido habitual",
          note: "Dejar en la puerta si no hay quien reciba.",
          order: { water20: 1, water12: 1, soda: 0 },
          priceSnapshot: { ...prices },
        },
        {
          id: 3,
          position: 3,
          name: "Valentina Cruz",
          initials: "VC",
          avatar: "avatar-purple",
          address: "Av. de los Incas 322",
          phone: "+54 11 5555 0103",
          status: "confirmed",
          lastMessage: "Respondió: pedido habitual",
          note: "Casa con reja negra.",
          order: { water20: 0, water12: 2, soda: 1 },
          priceSnapshot: { ...prices },
        },
        {
          id: 4,
          position: 4,
          name: "Diego Torres",
          initials: "DT",
          avatar: "avatar-orange",
          address: "Pje. Los Alpes 45",
          phone: "+54 11 5555 0104",
          status: "delivered",
          lastMessage: "Entrega registrada",
          note: "",
          order: { water20: 2, water12: 0, soda: 0 },
          priceSnapshot: { ...prices },
        },
        {
          id: 5,
          position: 5,
          name: "Carla Medina",
          initials: "CM",
          avatar: "avatar-rose",
          address: "Rivadavia 1220",
          phone: "+54 11 5555 0105",
          status: "pending",
          lastMessage: "Esperando respuesta",
          note: "Local de indumentaria.",
          order: { water20: 1, water12: 0, soda: 0 },
          priceSnapshot: { ...prices },
        },
        {
          id: 6,
          position: 6,
          name: "Pedro García",
          initials: "PG",
          avatar: "avatar-slate",
          address: "Av. San Martín 991",
          phone: "+54 11 5555 0106",
          status: "declined",
          lastMessage: "Respondió: hoy no necesita",
          note: "",
          order: { water20: 0, water12: 0, soda: 0 },
          priceSnapshot: { ...prices },
        },
        {
          id: 7,
          position: 7,
          name: "Ana Gutiérrez",
          initials: "AG",
          avatar: "avatar-blue",
          address: "Bolívar 703",
          phone: "+54 11 5555 0107",
          status: "rescheduled",
          lastMessage: "Solicitó reprogramación",
          note: "Pedido para el viernes por la tarde.",
          order: { water20: 1, water12: 1, soda: 0 },
          priceSnapshot: { ...prices },
          rescheduledDate: nextDate(1),
        },
        {
          id: 8,
          position: 8,
          name: "Sofía Herrera",
          initials: "SH",
          avatar: "avatar-teal",
          address: "Las Heras 245",
          phone: "+54 11 5555 0108",
          status: "delivered",
          lastMessage: "Entrega registrada",
          note: "",
          order: { water20: 0, water12: 1, soda: 1 },
          priceSnapshot: { ...prices },
        },
      ],
      movements: [
        { id: 1, type: "load", productKey: "water20", quantity: 40, label: "Carga inicial · Bidón 20 L", time: "07:10" },
        { id: 2, type: "load", productKey: "water12", quantity: 20, label: "Carga inicial · Bidón 12 L", time: "07:10" },
        { id: 3, type: "out", productKey: "water20", quantity: 2, label: "Entrega · Diego Torres", time: "08:42" },
        { id: 4, type: "out", productKey: "water12", quantity: 1, label: "Entrega · Sofía Herrera", time: "09:05" },
      ],
      rescheduleRequests: [],
      messageJobs: [],
      syncQueue: [],
      dailyRuns: [],
      routeHistory: [],
      lastSyncAt: new Date().toISOString(),
      lastRouteGenerationAt: new Date().toISOString(),
    };

    const currentDay = getWeekdayKey(initialState.routeDate);
    initialState.clients = initialState.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      initials: stop.initials,
      avatar: stop.avatar,
      phone: stop.phone,
      address: stop.address,
      notes: stop.note || "",
      days: [currentDay],
      defaultOrder: { ...stop.order },
      whatsappOptIn: true,
      driverId: "driver-luis",
      active: true,
      routePosition: stop.position,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    initialState.stops.forEach((stop) => { stop.clientId = stop.id; });
    initialState.messageJobs = createInitialMessageJobs(initialState.stops, initialState.routeDate);
    initialState.dailyRun = { id: `run-${initialState.routeDate}`, serviceDate: initialState.routeDate, weekday: currentDay, status: "planned", generatedAt: new Date().toISOString(), stopCount: initialState.stops.length, stopIds: initialState.stops.map((stop) => stop.id) };
    initialState.dailyRuns = [initialState.dailyRun];
    return initialState;
  }

  function nextDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  const DAY_KEYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const ROUTE_DAY_KEYS = DAY_KEYS.slice(1);
  const DAY_SHORT = { domingo: "Dom", lunes: "Lun", martes: "Mar", miércoles: "Mié", jueves: "Jue", viernes: "Vie", sábado: "Sáb" };

  function getWeekdayKey(dateValue) {
    const date = typeof dateValue === "string" ? new Date(`${dateValue}T12:00:00`) : dateValue;
    return DAY_KEYS[date.getDay()];
  }

  function createInitialMessageJobs(stops, serviceDate) {
    return stops.map((stop, index) => ({
      id: `msg-${serviceDate}-${stop.id}`,
      stopId: stop.id,
      clientId: stop.id,
      serviceDate,
      kind: "daily_consultation",
      idempotencyKey: `${stop.id}:daily_consultation:1`,
      status: ["pending", "no_answer"].includes(stop.status) ? "queued" : stop.status === "confirmed" ? "replied" : "skipped",
      response: stop.status === "confirmed" ? "confirmed" : stop.status === "declined" ? "declined" : null,
      attempts: stop.status === "confirmed" ? 1 : 0,
      channel: "mock",
      providerMessageId: stop.status === "confirmed" ? `demo-${index + 1}` : null,
      createdAt: new Date().toISOString(),
      sentAt: stop.status === "confirmed" ? new Date().toISOString() : null,
      lastError: null,
    }));
  }
  function loadState() {
    const base = createInitialState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return base;
      return {
        ...base,
        ...saved,
        prices: { ...base.prices, ...(saved.prices || {}) },
        remoteProducts: { ...base.remoteProducts, ...(saved.remoteProducts || {}) },
        vehicleRemoteId: saved.vehicleRemoteId || base.vehicleRemoteId,
        stock: { ...base.stock, ...(saved.stock || {}) },
        reserved: { ...base.reserved, ...(saved.reserved || {}) },
        drivers: Array.isArray(saved.drivers) && saved.drivers.length ? saved.drivers : base.drivers,
        stops: Array.isArray(saved.stops) && saved.stops.length ? saved.stops : base.stops,
        clients: Array.isArray(saved.clients) && saved.clients.length ? saved.clients : base.clients,
        movements: Array.isArray(saved.movements) ? saved.movements : base.movements,
        rescheduleRequests: Array.isArray(saved.rescheduleRequests) ? saved.rescheduleRequests : [],
        messageJobs: Array.isArray(saved.messageJobs) ? saved.messageJobs : base.messageJobs,
        syncQueue: Array.isArray(saved.syncQueue) ? saved.syncQueue : [],
        dailyRuns: Array.isArray(saved.dailyRuns) ? saved.dailyRuns : base.dailyRuns,
        routeHistory: Array.isArray(saved.routeHistory) ? saved.routeHistory : base.routeHistory,
      };
    } catch (error) {
      return base;
    }
  }

  let state = loadState();
  let activeView = "home";
  let activeStopId = null;
  let activeClientId = null;
  let activeSheet = null;
  let activeMovementType = "load";
  let routeFilter = "all";
  let routeSearch = "";
  let clientSearch = "";
  let clientDayFilter = "all";
  let realtimeChannel = null;
  let suppressRealtime = false;

  function saveState(notify = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (notify) publishRealtime("state_changed");
    } catch (error) {
      // La demo puede seguir funcionando aunque el navegador bloquee el almacenamiento local.
    }
  }

  function publishRealtime(type = "state_changed") {
    if (suppressRealtime) return;
    const event = { type, at: Date.now() };
    try {
      if (realtimeChannel) realtimeChannel.postMessage(event);
      localStorage.setItem(`${STORAGE_KEY}-event`, JSON.stringify(event));
    } catch (error) {
      // El estado local sigue funcionando aunque el canal no esté disponible.
    }
  }

  function setupRealtime() {
    if ("BroadcastChannel" in window) {
      realtimeChannel = new BroadcastChannel("aguaflow-realtime");
      realtimeChannel.addEventListener("message", () => {
        state = loadState();
        renderAll();
      });
    }
    window.addEventListener("storage", (event) => {
      if (event.key === `${STORAGE_KEY}-event` || event.key === STORAGE_KEY) {
        state = loadState();
        renderAll();
      }
    });
    window.addEventListener("online", () => {
      state.isOffline = false;
      flushSyncQueue();
      saveState();
      renderAll();
    });
    window.addEventListener("offline", () => {
      state.isOffline = true;
      saveState();
      renderAll();
    });
  }

  function getStop(id) {
    return state.stops.find((stop) => Number(stop.id) === Number(id));
  }

  function getClient(id) {
    return state.clients.find((client) => Number(client.id) === Number(id));
  }

  function isAdmin() {
    return state.role === "admin";
  }

  function nextEntityId(prefix = "entity") {
    const numericIds = state.clients.map((client) => Number(String(client.id).replace(/\D/g, ""))).filter(Number.isFinite);
    const next = Math.max(0, ...numericIds) + 1;
    return `${prefix}-${next}`;
  }

  function cloneOrder(order = {}) {
    return Object.fromEntries(Object.keys(PRODUCT_META).map((key) => [key, Math.max(0, Number(order[key] || 0))]));
  }

  function remotePayload(payload = {}) {
    const translated = { ...payload };
    if (payload.clientId && getClient(payload.clientId)?.remoteId) translated.remoteClientId = getClient(payload.clientId).remoteId;
    if (payload.stopId && getStop(payload.stopId)?.remoteId) translated.remoteStopId = getStop(payload.stopId).remoteId;
    if (payload.productKey && state.remoteProducts?.[payload.productKey]) translated.remoteProductId = state.remoteProducts[payload.productKey];
    if (payload.vehicleId && state.vehicleRemoteId) translated.vehicleRemoteId = state.vehicleRemoteId;
    if (payload.driverId) translated.driverRemoteId = state.drivers?.find((driver) => String(driver.id) === String(payload.driverId))?.remoteId;
    if (payload.rows) translated.rows = payload.rows.map((row) => remotePayload(row));
    return translated;
  }

  function dayName(day) {
    return DAY_SHORT[day] || day;
  }

  function driverName(id) {
    return state.drivers?.find((driver) => String(driver.id) === String(id))?.name || "Sin asignar";
  }

  function statusMeta(status) {
    return STATUS_META[status] || STATUS_META.pending;
  }

  function orderTotal(stop) {
    return Object.entries(stop.order || {}).reduce((total, [key, quantity]) => {
      const price = Number(stop.priceSnapshot?.[key] ?? state.prices[key] ?? 0);
      return total + price * Number(quantity || 0);
    }, 0);
  }

  function orderSummary(stop) {
    const items = Object.entries(stop.order || {})
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([key, quantity]) => `${quantity}× ${PRODUCT_META[key].short}`);
    return items.length ? items.join(" · ") : "Sin pedido";
  }

  function isException(stop) {
    return ["declined", "rescheduled", "no_answer"].includes(stop.status);
  }

  function renderDateLabels() {
    const date = state.routeDate;
    const long = longDate(date);
    const short = shortDate(date);
    $("#hero-date").textContent = long;
    $("#sidebar-date").textContent = short;
    $("#route-intro-date").textContent = long;
  }

  function renderMetrics() {
    const total = state.stops.length;
    const delivered = state.stops.filter((stop) => stop.status === "delivered").length;
    const confirmed = state.stops.filter((stop) => ["confirmed", "modified"].includes(stop.status)).length;
    const pending = state.stops.filter((stop) => ["pending", "no_answer"].includes(stop.status)).length;
    const exceptions = state.stops.filter(isException).length;
    const progress = total ? Math.round((delivered / total) * 100) : 0;

    $("#metric-confirmed").textContent = confirmed;
    $("#metric-pending").textContent = pending;
    $("#metric-delivered").textContent = delivered;
    $("#hero-delivered").textContent = delivered;
    $("#hero-total").textContent = total;
    $("#hero-remaining").textContent = total - delivered;
    $("#progress-value").textContent = `${progress}%`;
    $("#hero-progress-fill").style.width = `${progress}%`;
    $("#side-route-count").textContent = total;
    $("#mobile-route-badge").textContent = total - delivered;
    $("#route-progress-label").textContent = `${delivered}/${total}`;
    $("#filter-all-count").textContent = total;
    $("#filter-pending-count").textContent = pending;
    $("#filter-confirmed-count").textContent = confirmed;
    $("#filter-delivered-count").textContent = delivered;
    $("#filter-exception-count").textContent = exceptions;

    const ring = $("#progress-ring");
    ring.style.setProperty("--progress", `${progress}%`);
  }

  function renderHomeStops() {
    const stops = state.stops.filter((stop) => stop.status !== "delivered").slice(0, 4);
    const list = $("#home-stop-list");
    if (!stops.length) {
      list.innerHTML = `<div class="empty-state">${icon("check")}<p>No quedan paradas pendientes.</p></div>`;
      return;
    }
    list.innerHTML = stops.map(renderHomeStopCard).join("");
  }

  function renderHomeStopCard(stop) {
    const meta = statusMeta(stop.status);
    return `
      <button class="stop-card" type="button" data-stop-id="${stop.id}">
        <span class="stop-number">${String(stop.position).padStart(2, "0")}</span>
        <span class="client-avatar ${stop.avatar}">${escapeHTML(stop.initials)}</span>
        <span class="stop-main">
          <span class="stop-main-top"><strong>${escapeHTML(stop.name)}</strong></span>
          <small>${escapeHTML(stop.address)}</small>
        </span>
        <span class="stop-side">
          <span class="order-summary">${escapeHTML(orderSummary(stop))}</span>
          <span class="status-badge ${meta.className}">${meta.label}</span>
        </span>
      </button>`;
  }

  function matchesRouteFilter(stop) {
    if (routeFilter === "all") return true;
    if (routeFilter === "exception") return isException(stop);
    if (routeFilter === "pending") return ["pending", "no_answer"].includes(stop.status);
    if (routeFilter === "confirmed") return ["confirmed", "modified"].includes(stop.status);
    return stop.status === routeFilter;
  }

  function renderRouteList() {
    const normalizedSearch = routeSearch.trim().toLowerCase();
    const stops = state.stops.filter((stop) => {
      const matchesSearch = !normalizedSearch || `${stop.name} ${stop.address}`.toLowerCase().includes(normalizedSearch);
      return matchesRouteFilter(stop) && matchesSearch;
    });
    const list = $("#route-list");
    if (!stops.length) {
      list.innerHTML = `<div class="empty-state">${icon("more")}<p>No hay paradas que coincidan con el filtro.</p></div>`;
      return;
    }
    list.innerHTML = stops.map(renderRouteCard).join("");
  }

  function renderRouteCard(stop) {
    const meta = statusMeta(stop.status);
    return `
      <button class="route-card is-${stop.status}" type="button" data-stop-id="${stop.id}">
        <span class="stop-number">${String(stop.position).padStart(2, "0")}</span>
        <span class="client-avatar ${stop.avatar}">${escapeHTML(stop.initials)}</span>
        <span class="route-main">
          <span class="route-main-top"><strong>${escapeHTML(stop.name)}</strong></span>
          <small>${escapeHTML(stop.address)}</small>
          <small>${escapeHTML(stop.note || "Sin notas de acceso")}</small>
        </span>
        <span class="route-side">
          <span class="status-badge ${meta.className}">${meta.label}</span>
          <span class="order-summary">${escapeHTML(orderSummary(stop))}</span>
        </span>
        <span class="route-arrow">${icon("chevron")}</span>
      </button>`;
  }

  function renderHomeStock() {
    const list = $("#home-stock-list");
    list.innerHTML = Object.entries(PRODUCT_META)
      .map(([key, product]) => `<div class="stock-mini-item"><span class="mini-product-icon">${product.icon}</span><strong>${state.stock[key]}</strong><span>${product.short}</span></div>`)
      .join("");
  }

  function renderStock() {
    const totalStock = Object.values(state.stock).reduce((sum, value) => sum + Number(value || 0), 0);
    const totalReserved = Object.values(state.reserved).reduce((sum, value) => sum + Number(value || 0), 0);
    $("#stock-overview").innerHTML = `
      <div class="overview-card primary"><span class="eyebrow">EN EL CAMIÓN</span><strong>${totalStock}</strong><span>unidades disponibles</span></div>
      <div class="overview-card"><span class="eyebrow">RESERVADO</span><strong>${totalReserved}</strong><span>para pedidos confirmados</span></div>
      <div class="overview-card"><span class="eyebrow">ENTREGAS</span><strong>${state.stops.filter((stop) => stop.status === "delivered").length}</strong><span>paradas completadas</span></div>`;

    $("#stock-grid").innerHTML = Object.entries(PRODUCT_META)
      .map(([key, product]) => {
        const stock = Number(state.stock[key] || 0);
        const capacity = key === "water20" ? 50 : key === "water12" ? 30 : 20;
        const percent = Math.min(100, Math.round((stock / capacity) * 100));
        return `<article class="stock-card">
          <div class="stock-card-top"><span class="product-icon ${product.tone}">${product.icon}</span><span class="stock-adjust"><button type="button" data-stock-action="decrease" data-product-key="${key}" aria-label="Restar ${product.name}">${icon("minus")}</button><button type="button" data-stock-action="increase" data-product-key="${key}" aria-label="Sumar ${product.name}">${icon("plus")}</button></span></div>
          <h3>${product.name}</h3>
          <div class="stock-quantity"><strong>${stock}</strong><span>${product.unit}s</span></div>
          <div class="stock-bar"><i class="${product.tone}" style="width:${percent}%"></i></div>
          <div class="stock-card-foot"><span>Reservado: <strong>${state.reserved[key] || 0}</strong></span><span>${percent}%</span></div>
        </article>`;
      })
      .join("");

    $("#movement-list").innerHTML = state.movements.slice().reverse().slice(0, 8).map((movement) => {
      const isOut = movement.type === "out";
      const iconName = isOut ? "arrow" : movement.type === "return" ? "refresh" : "plus";
      return `<div class="movement-row"><span class="movement-icon ${isOut ? "out" : movement.type === "return" ? "return" : ""}">${icon(iconName)}</span><span class="movement-info"><strong>${escapeHTML(movement.label)}</strong><span>${escapeHTML(movement.time || "Ahora")}</span></span><span class="movement-qty">${isOut ? "−" : "+"}${movement.quantity}</span></div>`;
    }).join("");
  }

  function renderOrderEditor(stop) {
    const editor = $("#order-editor");
    editor.innerHTML = Object.entries(PRODUCT_META)
      .map(([key, product]) => {
        const quantity = Number(stop.order?.[key] || 0);
        const price = Number(stop.priceSnapshot?.[key] ?? state.prices[key] ?? 0);
        return `<div class="order-product-row">
          <span class="order-product-icon ${product.tone}">${product.icon}</span>
          <span class="order-product-info"><strong>${product.name}</strong><span>${money(price)} c/u</span></span>
          <span class="qty-control"><button type="button" data-qty-action="decrease" data-product-key="${key}" aria-label="Restar ${product.name}">${icon("minus")}</button><output data-quantity-key="${key}">${quantity}</output><button type="button" data-qty-action="increase" data-product-key="${key}" aria-label="Sumar ${product.name}">${icon("plus")}</button></span>
          <span class="line-total" data-line-total-key="${key}">${money(price * quantity)}</span>
        </div>`;
      })
      .join("");
  }

  function updateSheetTotals(stop) {
    $("#sheet-total").textContent = money(orderTotal(stop));
    Object.keys(PRODUCT_META).forEach((key) => {
      const quantity = Number(stop.order?.[key] || 0);
      const price = Number(stop.priceSnapshot?.[key] ?? state.prices[key] ?? 0);
      const output = $(`[data-quantity-key="${key}"]`, $("#order-editor"));
      const lineTotal = $(`[data-line-total-key="${key}"]`, $("#order-editor"));
      if (output) output.textContent = quantity;
      if (lineTotal) lineTotal.textContent = money(price * quantity);
    });
  }

  function openStopSheet(id) {
    const stop = getStop(id);
    if (!stop) return;
    activeStopId = Number(id);
    activeSheet = "stop";
    const meta = statusMeta(stop.status);
    $("#sheet-position").textContent = `PARADA ${stop.position} DE ${state.stops.length}`;
    $("#sheet-client-name").textContent = stop.name;
    $("#sheet-address").textContent = stop.address;
    $("#sheet-phone").textContent = stop.phone;
    $("#sheet-status").textContent = meta.label;
    $("#sheet-status").className = `status-badge ${meta.className}`;
    $("#sheet-last-message").innerHTML = `${icon("message")} ${escapeHTML(stop.lastMessage || "Sin actividad reciente")}`;
    $("#sheet-deliver").innerHTML = `${icon("check")} ${stop.status === "delivered" ? "Entrega registrada" : "Registrar entrega"}`;
    $("#sheet-confirm").hidden = stop.status === "delivered" || stop.status === "declined";
    $("#sheet-decline").hidden = stop.status === "delivered" || stop.status === "declined";
    renderOrderEditor(stop);
    updateSheetTotals(stop);
    showSheet("stop-sheet");
  }

  function openRescheduleSheet() {
    const stop = getStop(activeStopId);
    if (!stop) return;
    $("#reschedule-client").textContent = stop.name;
    $("#reschedule-date").value = stop.rescheduledDate || nextDate(1);
    $("#reschedule-reason").value = "";
    showSheet("reschedule-sheet");
  }

  function openPriceSheet() {
    if (!isAdmin()) {
      showToast("La actualización de precios requiere permisos de administrador.", "alert");
      return;
    }
    $("#price-editor").innerHTML = Object.entries(PRODUCT_META)
      .map(([key, product]) => `<label class="price-editor-row"><span class="order-product-icon ${product.tone}">${product.icon}</span><span><strong>${product.name}</strong><small>Nuevo precio por ${product.unit}</small></span><span class="price-input-wrap"><span>$</span><input class="price-input" data-price-key="${key}" type="number" min="0" step="100" value="${state.prices[key]}" aria-label="Precio de ${product.name}" /></span></label>`)
      .join("");
    showSheet("price-sheet");
  }

  function openMovementSheet() {
    activeMovementType = "load";
    $$("[data-movement-type]", $("#movement-type-options")).forEach((button) => button.classList.toggle("active", button.dataset.movementType === activeMovementType));
    $("#movement-product").value = "water20";
    $("#movement-quantity").value = 1;
    $("#movement-reason").value = "";
    showSheet("movement-sheet");
  }

  function saveMovement() {
    const productKey = $("#movement-product").value;
    const quantity = Math.max(1, Number($("#movement-quantity").value) || 1);
    if (!PRODUCT_META[productKey]) return;
    const current = Number(state.stock[productKey] || 0);
    const isOut = activeMovementType === "return" ? false : activeMovementType === "adjustment" ? false : true;
    const next = isOut ? current + quantity : Math.max(0, current - quantity);
    const actual = next - current;
    if (!actual) {
      showToast("No hay cantidad suficiente para el movimiento.", "alert");
      return;
    }
    state.stock[productKey] = next;
    const reason = $("#movement-reason").value.trim();
    const labels = { load: "Carga", return: "Devolución", adjustment: "Ajuste" };
    state.movements.unshift({ id: Date.now(), type: isOut ? "load" : activeMovementType, productKey, quantity: Math.abs(actual), label: `${labels[activeMovementType]} · ${PRODUCT_META[productKey].name}${reason ? ` · ${reason}` : ""}`, time: "Ahora" });
    queueOperation("stock_movement", { vehicleId: "current", type: activeMovementType, productKey, quantity: Math.abs(actual), reason });
    saveState();
    closeSheets();
    renderStock();
    renderHomeStock();
    renderMetrics();
    showToast(`${labels[activeMovementType]} registrada.`);
  }

  function openInfoSheet(title, text, kicker = "PRÓXIMAMENTE") {
    $("#info-title").textContent = title;
    $("#info-text").textContent = text;
    $("#info-kicker").textContent = kicker;
    showSheet("info-sheet");
  }

  function showSheet(id) {
    $$(".bottom-sheet").forEach((sheet) => { sheet.hidden = sheet.id !== id; });
    $("#modal-backdrop").hidden = false;
    document.body.classList.add("sheet-open");
    activeSheet = id;
  }

  function closeSheets() {
    $$(".bottom-sheet").forEach((sheet) => { sheet.hidden = true; });
    $("#modal-backdrop").hidden = true;
    document.body.classList.remove("sheet-open");
    activeSheet = null;
    activeStopId = null;
  }

  function renderConnection() {
    const pill = $("#connection-toggle");
    const label = $("#connection-label");
    const offline = Boolean(state.isOffline);
    pill.classList.toggle("offline", offline);
    label.textContent = offline ? "Sin conexión" : "En línea";
    $("#offline-banner").hidden = !offline;
    const toggle = $("#offline-toggle");
    toggle.classList.toggle("is-on", offline);
  }

  function nextClientId() {
    const ids = state.clients.map((client) => Number(client.id)).filter(Number.isFinite);
    return Math.max(0, ...ids) + 1;
  }

  function normalizeHeader(value) {
    return String(value || "").replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  function normalizePhone(value) {
    return String(value || "").trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  }

  function normalizeDay(value) {
    const normalized = normalizeHeader(value);
    const aliases = { lun: "lunes", martes: "martes", mar: "martes", miercoles: "miércoles", mie: "miércoles", jueves: "jueves", jue: "jueves", viernes: "viernes", vie: "viernes", sabado: "sábado", sab: "sábado", monday: "lunes", tuesday: "martes", wednesday: "miércoles", thursday: "jueves", friday: "viernes", saturday: "sábado" };
    return aliases[normalized] || normalized;
  }

  function parseCSV(text) {
    const rows = [];
    const source = String(text || "").replace(/^\uFEFF/, "");
    const firstLine = source.split(/\r?\n/, 1)[0] || "";
    const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      const next = source[index + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell.trim());
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some((value) => value !== "")) rows.push(row);
    return rows;
  }

  function validateImportText(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) return { total: 0, valid: 0, invalid: 0, errors: ["El CSV no contiene datos."], rows: [] };
    const headers = rows[0].map(normalizeHeader);
    const getValue = (row, names) => row[headers.findIndex((header) => names.includes(header))] || "";
    const errors = [];
    const validRows = [];
    rows.slice(1).forEach((row, index) => {
      const name = getValue(row, ["nombre", "name", "cliente"]);
      const phone = normalizePhone(getValue(row, ["telefono", "phone", "whatsapp", "celular"]));
      const address = getValue(row, ["direccion", "address", "domicilio"]);
      const dayValue = getValue(row, ["dia", "dias", "day", "weekday"]);
      const days = dayValue.split(/[;,|/]+/).map(normalizeDay).filter((day) => ROUTE_DAY_KEYS.includes(day));
      const quantities = [getValue(row, ["bidon20", "agua20", "water20"]), getValue(row, ["bidon12", "agua12", "water12"]), getValue(row, ["sifon", "sifones", "soda"])].map((value) => Number(value || 0));
      if (!name || !phone || !address || !days.length) errors.push(`Fila ${index + 2}: falta nombre, teléfono, dirección o día válido.`);
      else if (quantities.some((value) => !Number.isInteger(value) || value < 0)) errors.push(`Fila ${index + 2}: las cantidades deben ser números enteros positivos.`);
      else validRows.push({ rowNumber: index + 2, name, phone, address, days, quantities });
    });
    return { total: rows.length - 1, valid: validRows.length, invalid: errors.length, errors, rows: validRows };
  }

  function initialsForName(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "?";
  }

  function clientOrderSummary(order) {
    const items = Object.entries(order || {}).filter(([, quantity]) => Number(quantity) > 0).map(([key, quantity]) => `${quantity}× ${PRODUCT_META[key].short}`);
    return items.length ? items.join(" · ") : "Sin pedido habitual";
  }

  function queueOperation(type, payload = {}) {
    const operationId = window.crypto?.randomUUID?.() || `00000000-0000-4000-8000-${String(Date.now()).slice(-12)}`;
    const operation = { id: operationId, type, payload, status: state.isOffline ? "pending" : "syncing", createdAt: new Date().toISOString(), syncedAt: null };
    state.syncQueue.push(operation);
    if (window.aguaflowSupabase?.configured) window.aguaflowSupabase.pushOperation({ ...operation, payload: remotePayload(operation.payload) }).catch(() => {});
    if (!state.isOffline) {
      window.setTimeout(() => {
        const current = state.syncQueue.find((item) => item.id === operation.id);
        if (current?.status === "syncing") {
          current.status = "synced";
          current.syncedAt = new Date().toISOString();
          state.lastSyncAt = current.syncedAt;
          saveState();
          renderSyncStatus();
        }
      }, 500);
    }
  }

  async function flushSyncQueue() {
    if (state.isOffline) return;
    const now = new Date().toISOString();
    const pending = state.syncQueue.filter((operation) => operation.status !== "synced");
    for (const operation of pending) {
      if (window.aguaflowSupabase?.configured) {
        try {
          const result = await window.aguaflowSupabase.pushOperation({ ...operation, payload: remotePayload(operation.payload) });
          if (result?.queued === false) {
            operation.status = "failed";
            operation.error = result.error || "No se pudo sincronizar";
            continue;
          }
        } catch (error) {
          operation.status = "failed";
          operation.error = String(error);
          continue;
        }
      }
      operation.status = "synced";
      operation.syncedAt = now;
      operation.error = null;
    }
    state.lastSyncAt = now;
    saveState();
    renderAll();
  }

  function renderSyncStatus() {
    const label = $("#sync-label");
    const status = $("#sync-status");
    if (!label || !status) return;
    const pending = state.syncQueue.filter((operation) => operation.status !== "synced").length;
    const offline = Boolean(state.isOffline);
    status.classList.toggle("has-pending", pending > 0);
    status.classList.toggle("offline", offline);
    label.textContent = offline ? "Sin conexión" : pending ? `${pending} pendiente${pending === 1 ? "" : "s"}` : "Sincronizado";
  }

  function renderRole() {
    const admin = isAdmin();
    const label = $("#role-label");
    const description = $("#role-description");
    const switchButton = $("#role-switch");
    const roleText = switchButton?.querySelector("span");
    if (label) label.textContent = admin ? "Administrador" : "Repartidor";
    if (description) description.textContent = admin ? "Puede administrar clientes, rutas y precios." : "Puede consultar su ruta, pedidos y entregas.";
    if (roleText) roleText.textContent = admin ? "Cambiar a repartidor" : "Cambiar a administrador";
    $$('[data-admin-only="true"]').forEach((element) => { element.hidden = !admin; });
  }

  function renderClients() {
    const summary = $("#client-summary");
    if (!summary) return;
    const activeClients = state.clients.filter((client) => client.active !== false);
    const optedIn = activeClients.filter((client) => client.whatsappOptIn).length;
    const assigned = activeClients.filter((client) => Array.isArray(client.days) && client.days.length).length;
    summary.innerHTML = `<div class="admin-summary-card"><span class="eyebrow">CLIENTES ACTIVOS</span><strong>${activeClients.length}</strong><span>en la base local</span></div><div class="admin-summary-card"><span class="eyebrow">CON WHATSAPP</span><strong>${optedIn}</strong><span>consentimiento habilitado</span></div><div class="admin-summary-card"><span class="eyebrow">CON DÍAS</span><strong>${assigned}</strong><span>asignados a una ruta</span></div>`;
    const normalizedSearch = clientSearch.trim().toLowerCase();
    const clients = state.clients.filter((client) => {
      const matchesDay = clientDayFilter === "all" || (client.days || []).includes(clientDayFilter);
      const matchesSearch = !normalizedSearch || `${client.name} ${client.phone} ${client.address}`.toLowerCase().includes(normalizedSearch);
      return matchesDay && matchesSearch;
    });
    const list = $("#client-list");
    if (!clients.length) {
      list.innerHTML = `<div class="empty-state">${icon("users")}<p>No hay clientes para este filtro.</p></div>`;
      return;
    }
    list.innerHTML = clients.map((client) => `<button class="client-card" type="button" data-client-id="${client.id}"><span class="client-avatar ${client.avatar || "avatar-teal"}">${escapeHTML(client.initials || initialsForName(client.name))}</span><span class="client-card-main"><span class="client-card-title"><strong>${escapeHTML(client.name)}</strong>${client.active === false ? `<span class="status-badge status-declined">Inactivo</span>` : ""}</span><small>${escapeHTML(client.phone || "Sin teléfono")} · ${escapeHTML(client.address || "Sin dirección")}</small><small>Repartidor: ${escapeHTML(driverName(client.driverId))}</small></span><span class="client-card-side"><span class="client-days">${(client.days || []).map((day) => `<span class="day-chip">${dayName(day)}</span>`).join("") || `<span class="day-chip">Sin día</span>`}</span><span class="client-order-copy">${escapeHTML(clientOrderSummary(client.defaultOrder))}</span><span class="optin-badge ${client.whatsappOptIn ? "" : "off"}">${client.whatsappOptIn ? "WhatsApp activo" : "Sin consentimiento"}</span></span></button>`).join("");
  }

  function renderClientOrderPicker(values = {}) {
    const picker = $("#client-order-picker");
    if (!picker) return;
    picker.innerHTML = Object.entries(PRODUCT_META).map(([key, product]) => `<label class="client-order-row"><span>${product.icon} ${product.name}</span><input type="number" min="0" step="1" data-client-product="${key}" value="${Number(values[key] || 0)}" aria-label="Cantidad de ${product.name}" /></label>`).join("");
  }

  function openClientSheet(id = null) {
    const client = id ? getClient(id) : null;
    activeClientId = client ? Number(client.id) : null;
    $("#client-sheet-kicker").textContent = client ? "EDITAR CLIENTE" : "CLIENTE NUEVO";
    $("#client-sheet-title").textContent = client ? client.name : "Agregar cliente";
    $("#client-id").value = client?.id || "";
    $("#client-name-input").value = client?.name || "";
    $("#client-phone-input").value = client?.phone || "";
    $("#client-address-input").value = client?.address || "";
    $("#client-driver-input").innerHTML = state.drivers.map((driver) => `<option value="${escapeHTML(driver.id)}">${escapeHTML(driver.name)}</option>`).join("");
    $("#client-driver-input").value = client?.driverId || state.drivers[0]?.id || "";
    $("#client-notes-input").value = client?.notes || "";
    $("#client-optin-input").checked = client?.whatsappOptIn !== false;
    $("#client-active-input").checked = client?.active !== false;
    $$("#client-day-picker button").forEach((button) => button.classList.toggle("active", Boolean(client?.days?.includes(button.dataset.day))));
    renderClientOrderPicker(client?.defaultOrder || {});
    showSheet("client-sheet");
  }

  function saveClientFromForm() {
    if (!isAdmin()) {
      showToast("Necesitás permisos de administrador.", "alert");
      return;
    }
    const name = $("#client-name-input").value.trim();
    const phone = normalizePhone($("#client-phone-input").value);
    const address = $("#client-address-input").value.trim();
    const days = $$("#client-day-picker button.active").map((button) => button.dataset.day);
    if (!name || !phone || !address || !days.length) {
      showToast("Completá nombre, teléfono, dirección y al menos un día.", "alert");
      return;
    }
    const order = Object.fromEntries($$('[data-client-product]', $("#client-order-picker")).map((input) => [input.dataset.clientProduct, Math.max(0, Number(input.value) || 0)]));
    const existing = activeClientId ? getClient(activeClientId) : state.clients.find((client) => normalizePhone(client.phone) === phone);
    const palette = ["avatar-teal", "avatar-blue", "avatar-orange", "avatar-purple", "avatar-rose", "avatar-slate"];
    if (existing) {
      Object.assign(existing, { name, phone, address, driverId: $("#client-driver-input").value, notes: $("#client-notes-input").value.trim(), days, defaultOrder: order, whatsappOptIn: $("#client-optin-input").checked, active: $("#client-active-input").checked, updatedAt: new Date().toISOString() });
    } else {
      const id = nextClientId();
      state.clients.push({ id, name, initials: initialsForName(name), avatar: palette[state.clients.length % palette.length], phone, address, driverId: $("#client-driver-input").value, notes: $("#client-notes-input").value.trim(), days, defaultOrder: order, whatsappOptIn: $("#client-optin-input").checked, active: $("#client-active-input").checked, routePosition: state.clients.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    queueOperation(existing ? "update_client" : "create_client", { name, phone, address, driverId: $("#client-driver-input").value, days, defaultOrder: order, notes: $("#client-notes-input").value.trim(), whatsappOptIn: $("#client-optin-input").checked, active: $("#client-active-input").checked });
    saveState();
    generateDailyRoute(state.routeDate, true);
    closeSheets();
    renderAll();
    showToast(existing ? "Cliente actualizado." : "Cliente agregado.", "check");
  }

  function importClientsFromText(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) return { count: 0, errors: ["El CSV no contiene datos."] };
    const headers = rows[0].map(normalizeHeader);
    const getValue = (row, names) => row[headers.findIndex((header) => names.includes(header))] || "";
    const errors = [];
    const importedRows = [];
    let count = 0;
    rows.slice(1).forEach((row, rowIndex) => {
      const name = getValue(row, ["nombre", "name", "cliente"]);
      const phone = normalizePhone(getValue(row, ["telefono", "phone", "whatsapp", "celular"]));
      const address = getValue(row, ["direccion", "address", "domicilio"]);
      const dayValue = getValue(row, ["dia", "dias", "day", "weekday"]);
      const days = dayValue.split(/[;,|/]+/).map(normalizeDay).filter((day) => ROUTE_DAY_KEYS.includes(day));
      if (!name || !phone || !address || !days.length) {
        errors.push(`Fila ${rowIndex + 2}: falta nombre, teléfono, dirección o día válido.`);
        return;
      }
      const order = { water20: Math.max(0, Number(getValue(row, ["bidon20", "agua20", "water20"])) || 0), water12: Math.max(0, Number(getValue(row, ["bidon12", "agua12", "water12"])) || 0), soda: Math.max(0, Number(getValue(row, ["sifon", "sifones", "soda"])) || 0) };
      const driverValue = getValue(row, ["repartidor", "driver", "conductor"]);
      const driver = state.drivers.find((item) => item.name.toLowerCase() === driverValue.toLowerCase() || item.id === driverValue) || state.drivers[0];
      const whatsapp = ["1", "true", "si", "sí", "yes"].includes(String(getValue(row, ["whatsapp", "consentimiento", "optin"])).trim().toLowerCase());
      let client = state.clients.find((item) => normalizePhone(item.phone) === phone);
      if (client) {
        client.name = name;
        client.address = address;
        client.days = [...new Set([...(client.days || []), ...days])];
        client.defaultOrder = order;
        client.driverId = driver?.id || state.drivers[0]?.id;
        client.whatsappOptIn = whatsapp;
        client.updatedAt = new Date().toISOString();
      } else {
        const palette = ["avatar-teal", "avatar-blue", "avatar-orange", "avatar-purple", "avatar-rose", "avatar-slate"];
        const id = nextClientId();
        state.clients.push({ id, name, initials: initialsForName(name), avatar: palette[state.clients.length % palette.length], phone, address, driverId: driver?.id || state.drivers[0]?.id, notes: getValue(row, ["notas", "notes", "referencias"]), days, defaultOrder: order, whatsappOptIn: whatsapp, active: true, routePosition: state.clients.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        client = state.clients[state.clients.length - 1];
      }
      importedRows.push({ remoteId: client.remoteId, name, phone, address, driverId: driver?.id || state.drivers[0]?.id, days, defaultOrder: order, whatsappOptIn: whatsapp, notes: getValue(row, ["notas", "notes", "referencias"]) });
      count += 1;
    });
    queueOperation("import_clients", { count, source: "csv", rows: importedRows });
    return { count, errors };
  }

  function downloadTemplate() {
    const content = "nombre,telefono,direccion,dia,repartidor,bidon20,bidon12,soda,whatsapp,notas\nMaría López,+5491112345678,Av. Siempre Viva 742,lunes,Luis Sánchez,1,0,0,sí,Portón azul\nJosé Ramírez,+5491112345679,Calle Junín 1840,lunes,Luis Sánchez,1,1,0,sí,\n";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    link.download = "plantilla-clientes-aguaflow.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function getStopClientId(stop) {
    return Number(stop.clientId || stop.id);
  }

  function ensureMessageJob(stop, serviceDate) {
    let job = state.messageJobs.find((item) => Number(item.stopId) === Number(stop.id) && item.serviceDate === serviceDate);
    if (job) return job;
    const client = getClient(getStopClientId(stop));
    const shouldSkip = ["delivered", "declined", "rescheduled"].includes(stop.status) || !client?.whatsappOptIn;
    job = { id: `msg-${serviceDate}-${stop.id}`, stopId: stop.id, clientId: getStopClientId(stop), serviceDate, kind: "daily_consultation", idempotencyKey: `${stop.id}:daily_consultation:1`, status: shouldSkip ? "skipped" : "queued", response: null, attempts: 0, channel: "mock", providerMessageId: null, createdAt: new Date().toISOString(), sentAt: null, lastError: null };
    state.messageJobs.push(job);
    return job;
  }

  function generateDailyRoute(serviceDate = todayISO(), replace = true) {
    const day = getWeekdayKey(serviceDate);
    if (state.routeDate && state.routeDate !== serviceDate && state.stops.length) {
      const archived = state.routeHistory.find((item) => item.serviceDate === state.routeDate);
      if (!archived) state.routeHistory.push({ serviceDate: state.routeDate, stops: JSON.parse(JSON.stringify(state.stops)), archivedAt: new Date().toISOString() });
    }
    const assigned = state.clients.filter((client) => client.active !== false && (client.days || []).includes(day)).sort((a, b) => Number(a.routePosition || 0) - Number(b.routePosition || 0));
    const previous = new Map(state.stops.map((stop) => [getStopClientId(stop), stop]));
    let nextStopId = Math.max(0, ...state.stops.map((stop) => Number(stop.id) || 0), ...state.dailyRuns.flatMap((run) => (run.stopIds || []).map(Number))) + 1;
    const generated = assigned.map((client, index) => {
      const old = previous.get(Number(client.id));
      return { id: old?.id || nextStopId++, clientId: client.id, position: index + 1, name: client.name, initials: client.initials, avatar: client.avatar, address: client.address, phone: client.phone, status: old?.status || "pending", lastMessage: old?.lastMessage || "Esperando consulta", note: client.notes || "", order: cloneOrder(old?.order || client.defaultOrder), priceSnapshot: { ...(old?.priceSnapshot || state.prices) } };
    });
    state.routeDate = serviceDate;
    state.stops = generated;
    const runId = `run-${serviceDate}`;
    let run = state.dailyRuns.find((item) => item.serviceDate === serviceDate);
    if (!run) {
      run = { id: runId, serviceDate, weekday: day, status: "planned", generatedAt: new Date().toISOString(), stopIds: [] };
      state.dailyRuns.push(run);
    }
    run.stopIds = generated.map((stop) => stop.id);
    run.stopCount = generated.length;
    run.generatedAt = new Date().toISOString();
    state.dailyRun = run;
    const validIds = new Set(generated.map((stop) => Number(stop.id)));
    state.messageJobs = state.messageJobs.filter((job) => job.serviceDate !== serviceDate || validIds.has(Number(job.stopId)));
    generated.forEach((stop) => ensureMessageJob(stop, serviceDate));
    state.lastRouteGenerationAt = new Date().toISOString();
    queueOperation("generate_daily_route", { serviceDate, weekday: day, stopCount: generated.length, replace });
    saveState();
    if (!state.isOffline) window.setTimeout(processMessageQueue, 450);
  }

  function processMessageQueue() {
    if (state.isOffline) return;
    state.messageJobs.filter((job) => job.status === "queued" && job.serviceDate === state.routeDate && getClient(job.clientId)?.whatsappOptIn === false).forEach((job) => { job.status = "skipped"; });
    const queued = state.messageJobs.filter((job) => job.status === "queued" && job.serviceDate === state.routeDate && getClient(job.clientId)?.whatsappOptIn);
    if (!queued.length) return;
    queued.forEach((job, index) => {
      job.status = "sent";
      job.attempts += 1;
      job.channel = "mock";
      job.providerMessageId = `demo-${job.stopId}-${Date.now()}-${index}`;
      job.sentAt = new Date().toISOString();
      const stop = getStop(job.stopId);
      if (stop) stop.lastMessage = "Consulta enviada · esperando respuesta";
    });
    queueOperation("dispatch_message_jobs", { count: queued.length });
    saveState();
    renderAll();
  }

  function simulateMessageResponse(jobId, action) {
    const job = state.messageJobs.find((item) => item.id === jobId);
    const stop = job ? getStop(job.stopId) : null;
    if (!job || !stop) return;
    if (action === "send") {
      job.status = "sent";
      job.attempts += 1;
      job.providerMessageId = job.providerMessageId || `demo-${job.stopId}-${Date.now()}`;
      job.sentAt = new Date().toISOString();
      stop.lastMessage = "Consulta enviada · esperando respuesta";
    } else if (action === "confirm") {
      job.status = "replied";
      job.response = "confirmed";
      stop.status = "confirmed";
      stop.lastMessage = "Confirmó pedido por WhatsApp";
    } else if (action === "decline") {
      job.status = "replied";
      job.response = "declined";
      stop.status = "declined";
      stop.lastMessage = "Respondió: hoy no necesita";
    } else if (action === "modify") {
      job.status = "replied";
      job.response = "modified";
      stop.status = "modified";
      stop.lastMessage = "Solicitó modificar el pedido";
    } else if (action === "reschedule") {
      job.status = "replied";
      job.response = "reschedule_requested";
      stop.status = "rescheduled";
      stop.rescheduledDate = nextDate(1);
      stop.lastMessage = "Solicitó reprogramación";
      state.rescheduleRequests.unshift({ id: Date.now(), stopId: stop.id, clientName: stop.name, requestedDate: stop.rescheduledDate, reason: "Respuesta simulada de WhatsApp", status: "requested", createdAt: new Date().toISOString() });
    }
    job.processedAt = new Date().toISOString();
    queueOperation("whatsapp_response", { jobId: job.id, action });
    saveState();
    renderAll();
    if (action === "modify") openStopSheet(stop.id);
    showToast(action === "send" ? "Consulta enviada." : "Respuesta aplicada a la ruta.", "message");
  }

  function renderRoutes() {
    const banner = $("#route-run-banner");
    const week = $("#week-grid");
    if (!banner || !week) return;
    const todayKey = getWeekdayKey(state.routeDate);
    const routeDays = ROUTE_DAY_KEYS;
    const generatedCount = state.stops.length;
    const delivered = state.stops.filter((stop) => stop.status === "delivered").length;
    banner.innerHTML = `<span class="route-run-banner-icon">${icon("route")}</span><span class="route-run-banner-copy"><strong>${state.routeName} · ${longDate(state.routeDate)}</strong><span>${generatedCount} paradas generadas · ${delivered} entregadas · ${state.stops.filter((stop) => ["pending", "no_answer"].includes(stop.status)).length} pendientes de respuesta</span></span><span class="status-badge status-confirmed">${state.dailyRun?.status === "planned" ? "PLANIFICADA" : "ACTIVA"}</span>`;
    week.innerHTML = routeDays.map((day) => {
      const clients = state.clients.filter((client) => client.active !== false && (client.days || []).includes(day));
      return `<div class="week-day ${day === todayKey ? "today" : ""}"><div class="week-day-header"><strong>${dayName(day)}</strong><span>${clients.length}</span></div>${clients.length ? clients.slice(0, 4).map((client) => `<div class="week-client"><span class="client-avatar ${client.avatar || "avatar-teal"}">${escapeHTML(client.initials || initialsForName(client.name))}</span><span>${escapeHTML(client.name)}</span></div>`).join("") : `<span class="week-empty">Sin clientes asignados</span>`}${clients.length > 4 ? `<span class="week-empty">+${clients.length - 4} más</span>` : ""}</div>`;
    }).join("");
    const list = $("#generated-route-list");
    list.innerHTML = state.stops.length ? state.stops.map(renderRouteCard).join("") : `<div class="empty-state">${icon("route")}<p>No hay clientes asignados para este día.</p></div>`;
    const generated = $("#route-generated-label");
    if (generated) generated.textContent = state.lastRouteGenerationAt ? `Actualizada ${new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(state.lastRouteGenerationAt))}` : "Sin generar";
  }

  function renderMessages() {
    const summary = $("#message-summary");
    const list = $("#message-list");
    if (!summary || !list) return;
    const queued = state.messageJobs.filter((job) => job.status === "queued").length;
    const sent = state.messageJobs.filter((job) => job.status === "sent").length;
    const replied = state.messageJobs.filter((job) => job.status === "replied").length;
    summary.innerHTML = `<div class="message-summary-card"><span class="eyebrow">EN COLA</span><strong>${queued}</strong><span>consultas pendientes</span></div><div class="message-summary-card"><span class="eyebrow">ENVIADAS</span><strong>${sent}</strong><span>por el simulador</span></div><div class="message-summary-card"><span class="eyebrow">RESPONDIDAS</span><strong>${replied}</strong><span>actualizaciones recibidas</span></div>`;
    const jobs = state.messageJobs.filter((job) => job.serviceDate === state.routeDate);
    if (!jobs.length) {
      list.innerHTML = `<div class="empty-state">${icon("message")}<p>Generá una ruta para crear la cola de mensajes.</p></div>`;
      return;
    }
    list.innerHTML = jobs.map((job) => {
      const client = getClient(job.clientId) || getStop(job.stopId) || {};
      const statusLabel = { queued: "En cola", sent: "Enviada", replied: "Respondida", failed: "Error", skipped: "Omitida" }[job.status] || job.status;
      const responseLabel = job.status === "skipped" ? (job.response === "declined" ? "No necesita" : "No aplica") : job.response === "confirmed" ? "Confirmó pedido" : job.response === "declined" ? "No necesita" : job.response === "modified" ? "Pide modificar" : job.response === "reschedule_requested" ? "Pide reprogramar" : job.sentAt ? "Esperando respuesta" : "Pendiente de envío";
      const actions = job.status === "queued" || job.status === "failed" ? `<button class="message-action" data-message-action="send" data-message-id="${job.id}">Enviar</button>` : job.status === "sent" ? `<button class="message-action confirm" data-message-action="confirm" data-message-id="${job.id}">Sí</button><button class="message-action" data-message-action="modify" data-message-id="${job.id}">Modificar</button><button class="message-action" data-message-action="reschedule" data-message-id="${job.id}">Reprogramar</button><button class="message-action decline" data-message-action="decline" data-message-id="${job.id}">No</button>` : "";
      return `<article class="message-card"><div class="message-card-top"><div class="message-card-main"><span class="client-avatar ${client.avatar || "avatar-teal"}">${escapeHTML(client.initials || initialsForName(client.name))}</span><span class="message-card-copy"><strong>${escapeHTML(client.name || "Cliente")}</strong><span>${escapeHTML(client.phone || "Sin teléfono")} · ${job.serviceDate}</span></span></div><span class="message-job-status ${job.status}">${statusLabel}</span></div><div class="message-card-bottom"><small>${responseLabel}${job.attempts ? ` · ${job.attempts} intento${job.attempts === 1 ? "" : "s"}` : ""}</small><span class="message-actions">${actions}</span></div></article>`;
    }).join("");
  }

  function previewImport() {
    const text = $("#client-csv-text")?.value.trim() || "";
    const preview = $("#import-preview");
    const confirm = $("#import-confirm-button");
    if (!preview || !confirm) return;
    const validation = validateImportText(text);
    confirm.disabled = validation.valid < 1;
    if (!text) {
      preview.hidden = true;
      preview.textContent = "";
      return;
    }
    preview.hidden = false;
    preview.innerHTML = validation.valid ? `<strong>${validation.valid} fila${validation.valid === 1 ? "" : "s"} válida${validation.valid === 1 ? "" : "s"}.</strong>${validation.invalid ? `<br><span class="import-error-count">${validation.invalid} fila${validation.invalid === 1 ? "" : "s"} con error${validation.invalid === 1 ? "" : "s"}.</span>` : ""}<br>${validation.errors.slice(0, 2).map(escapeHTML).join("<br>")}` : validation.errors[0] || "Agregá al menos una fila debajo del encabezado.";
  }

  function renderAll() {
    renderDateLabels();
    renderMetrics();
    renderHomeStops();
    renderRouteList();
    renderHomeStock();
    renderStock();
    renderConnection();
    renderRole();
    renderSyncStatus();
    renderClients();
    renderRoutes();
    renderMessages();
  }

  function showView(view) {
    if (!["home", "route", "stock", "more", "clients", "routes", "messages"].includes(view)) return;
    if (["clients", "routes", "messages"].includes(view) && !isAdmin()) {
      showToast("Esta sección es para administradores.", "alert");
      return;
    }
    activeView = view;
    $$(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
    $$("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message, iconName = "check") {
    const container = $("#toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `${icon(iconName)}<span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function updateStopStatus(id, status, message) {
    const stop = getStop(id);
    if (!stop) return;
    stop.status = status;
    stop.lastMessage = message;
    stop.updatedAt = new Date().toISOString();
    queueOperation("update_stop_status", { stopId: id, status, message });
    saveState();
    renderAll();
    if (activeStopId === Number(id) && activeSheet === "stop-sheet") openStopSheet(id);
  }

  function adjustQuantity(key, amount) {
    const stop = getStop(activeStopId);
    if (!stop || !PRODUCT_META[key]) return;
    stop.order[key] = Math.max(0, Number(stop.order[key] || 0) + amount);
    queueOperation("update_order_item", { stopId: stop.id, productKey: key, quantity: stop.order[key] });
    saveState();
    updateSheetTotals(stop);
    renderHomeStops();
    renderRouteList();
  }

  function registerDelivery() {
    const stop = getStop(activeStopId);
    if (!stop) return;
    if (stop.status === "delivered") {
      showToast("Esta entrega ya estaba registrada.");
      return;
    }
    const requested = Object.entries(stop.order || {}).filter(([, quantity]) => Number(quantity) > 0);
    if (!requested.length) {
      showToast("Agregá al menos un producto antes de entregar.", "alert");
      return;
    }
    const unavailable = requested.find(([key, quantity]) => Number(state.stock[key] || 0) < Number(quantity));
    if (unavailable) {
      showToast(`No hay stock suficiente de ${PRODUCT_META[unavailable[0]].name}.`, "alert");
      return;
    }
    requested.forEach(([key, quantity]) => {
      state.stock[key] = Number(state.stock[key] || 0) - Number(quantity);
      state.movements.unshift({ id: Date.now() + Number(quantity), type: "out", productKey: key, quantity: Number(quantity), label: `Entrega · ${stop.name}`, time: "Ahora" });
    });
    stop.status = "delivered";
    stop.lastMessage = "Entrega registrada";
    stop.deliveredAt = new Date().toISOString();
    queueOperation("register_delivery", { stopId: stop.id, items: requested.map(([key, quantity]) => ({ product_code: ({ water20: "W20", water12: "W12", soda: "SODA" })[key], quantity: Number(quantity) })) });
    saveState();
    closeSheets();
    renderAll();
    showToast(`Entrega de ${stop.name} registrada.`);
  }

  function sendReminder() {
    const stop = getStop(activeStopId);
    if (!stop) return;
    stop.lastMessage = "Recordatorio enviado ahora";
    queueOperation("send_reminder", { stopId: stop.id });
    saveState();
    updateSheetTotals(stop);
    openStopSheet(stop.id);
    showToast("Recordatorio de WhatsApp simulado.", "message");
  }

  function saveReschedule() {
    const stop = getStop(activeStopId);
    if (!stop) return;
    const date = $("#reschedule-date").value || nextDate(1);
    const reason = $("#reschedule-reason").value.trim();
    stop.status = "rescheduled";
    stop.rescheduledDate = date;
    stop.lastMessage = reason ? `Reprogramado: ${reason}` : "Reprogramación solicitada";
    state.rescheduleRequests.unshift({ id: Date.now(), stopId: stop.id, clientName: stop.name, requestedDate: date, reason, status: "requested", createdAt: new Date().toISOString() });
    queueOperation("create_reschedule_request", { stopId: stop.id, requestedDate: date, reason });
    saveState();
    closeSheets();
    renderAll();
    showToast(`Solicitud para ${stop.name} guardada.`, "calendar");
  }

  function adjustStock(key, amount) {
    if (!PRODUCT_META[key]) return;
    const next = Math.max(0, Number(state.stock[key] || 0) + amount);
    const actual = next - Number(state.stock[key] || 0);
    if (!actual) return;
    state.stock[key] = next;
    state.movements.unshift({ id: Date.now(), type: amount > 0 ? "load" : "return", productKey: key, quantity: Math.abs(actual), label: `${amount > 0 ? "Carga" : "Ajuste"} manual · ${PRODUCT_META[key].name}`, time: "Ahora" });
    queueOperation("adjust_stock", { vehicleId: "current", productKey: key, delta: actual });
    saveState();
    renderStock();
    renderHomeStock();
    renderMetrics();
    showToast(`${PRODUCT_META[key].name}: ${actual > 0 ? "+" : "−"}${Math.abs(actual)}.`, actual > 0 ? "plus" : "minus");
  }

  function savePrices() {
    const inputs = $$("[data-price-key]", $("#price-editor"));
    inputs.forEach((input) => {
      const value = Math.max(0, Number(input.value) || 0);
      state.prices[input.dataset.priceKey] = value;
    });
    queueOperation("update_prices", { prices: { ...state.prices } });
    saveState();
    closeSheets();
    renderStock();
    showToast("Precios actualizados para nuevos pedidos.");
  }

  function ensureCurrentDayRoute() {
    const today = todayISO();
    if (state.routeDate === today || !state.clients.length) return;
    generateDailyRoute(today, false);
    showToast("Se generó automáticamente la ruta del nuevo día.", "route");
  }

  function resetDemo() {
    if (!window.confirm("¿Restaurar los datos de demostración?")) return;
    state = createInitialState();
    routeFilter = "all";
    routeSearch = "";
    clientSearch = "";
    clientDayFilter = "all";
    $("#route-search").value = "";
    $("#client-search").value = "";
    saveState();
    closeSheets();
    renderAll();
    showView("home");
    showToast("Datos de demostración restaurados.");
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-view]");
      if (viewButton) {
        showView(viewButton.dataset.view);
        return;
      }

      const clientDayButton = event.target.closest("[data-client-day]");
      if (clientDayButton) {
        clientDayFilter = clientDayButton.dataset.clientDay;
        $$("[data-client-day]").forEach((button) => button.classList.toggle("active", button === clientDayButton));
        renderClients();
        return;
      }

      const filterButton = event.target.closest("[data-filter]");
      if (filterButton) {
        routeFilter = filterButton.dataset.filter;
        $$(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.filter === routeFilter));
        if (activeView !== "route") showView("route");
        renderRouteList();
        return;
      }

      const stopButton = event.target.closest("[data-stop-id]");
      if (stopButton) {
        openStopSheet(stopButton.dataset.stopId);
        return;
      }

      const clientButton = event.target.closest("[data-client-id]");
      if (clientButton) {
        if (!isAdmin()) {
          showToast("La edición de clientes requiere permisos de administrador.", "alert");
          return;
        }
        openClientSheet(clientButton.dataset.clientId);
        return;
      }

      const messageButton = event.target.closest("[data-message-action]");
      if (messageButton) {
        simulateMessageResponse(messageButton.dataset.messageId, messageButton.dataset.messageAction);
        return;
      }

      const actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        const action = actionButton.dataset.action;
        if (action === "next-stop") {
          const next = state.stops.find((stop) => stop.status !== "delivered");
          if (next) openStopSheet(next.id);
          else showToast("La ruta de hoy está completa.");
        }
        if (action === "show-prices") openPriceSheet();
        if (action === "show-clients") openInfoSheet("Gestión de clientes", "La edición de clientes, teléfonos y pedidos habituales estará disponible en la siguiente iteración.", "ADMINISTRACIÓN");
        if (action === "show-routes") openInfoSheet("Rutas semanales", "La pantalla permitiría asignar clientes por día y reordenar las paradas desde el teléfono.", "ADMINISTRACIÓN");
        if (action === "show-reports") openInfoSheet("Reportes de jornada", "Pronto podrás consultar ventas, pedidos cancelados y consumo por producto.", "PRÓXIMAMENTE");
        return;
      }

      const qtyButton = event.target.closest("[data-qty-action]");
      if (qtyButton) {
        adjustQuantity(qtyButton.dataset.productKey, qtyButton.dataset.qtyAction === "increase" ? 1 : -1);
        return;
      }

      const stockButton = event.target.closest("[data-stock-action]");
      if (stockButton) {
        adjustStock(stockButton.dataset.productKey, stockButton.dataset.stockAction === "increase" ? 1 : -1);
        return;
      }

      if (event.target.closest("[data-close-sheet]") || event.target === $("#modal-backdrop")) {
        closeSheets();
      }
    });

    $("#client-search").addEventListener("input", (event) => {
      clientSearch = event.target.value;
      renderClients();
    });

    $("#import-clients-button").addEventListener("click", () => {
      if (!isAdmin()) {
        showToast("La importación requiere permisos de administrador.", "alert");
        return;
      }
      $("#client-csv-text").value = "";
      $("#import-preview").hidden = true;
      $("#import-confirm-button").disabled = true;
      showSheet("import-sheet");
    });

    $("#new-client-button").addEventListener("click", () => {
      if (!isAdmin()) {
        showToast("La carga de clientes requiere permisos de administrador.", "alert");
        return;
      }
      openClientSheet();
    });

    $("#download-template-button").addEventListener("click", downloadTemplate);
    $("#import-template-button").addEventListener("click", () => {
      $("#client-csv-text").value = "nombre,telefono,direccion,dia,repartidor,bidon20,bidon12,soda,whatsapp,notas\nMaría López,+5491112345678,Av. Siempre Viva 742,lunes,Luis Sánchez,1,0,0,sí,Portón azul\nJosé Ramírez,+5491112345679,Calle Junín 1840,lunes,Luis Sánchez,1,1,0,sí,";
      previewImport();
    });

    $("#client-csv-input").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        $("#client-csv-text").value = String(reader.result || "");
        previewImport();
      };
      reader.readAsText(file, "UTF-8");
    });

    $("#client-csv-text").addEventListener("input", previewImport);

    $("#import-confirm-button").addEventListener("click", () => {
      if (!isAdmin()) return;
      const text = $("#client-csv-text").value.trim();
      const result = importClientsFromText(text);
      if (!result.count) {
        showToast(result.errors[0] || "No se pudieron importar clientes.", "alert");
        return;
      }
      generateDailyRoute(state.routeDate, true);
      closeSheets();
      renderAll();
      showToast(`${result.count} cliente${result.count === 1 ? "" : "s"} importado${result.count === 1 ? "" : "s"}.`, "check");
      if (result.errors.length) showToast(`${result.errors.length} fila${result.errors.length === 1 ? "" : "s"} necesita${result.errors.length === 1 ? "" : "n"} revisión.`, "alert");
    });

    $("#generate-route-button").addEventListener("click", () => {
      if (!isAdmin()) return;
      generateDailyRoute(state.routeDate, true);
      renderAll();
      showToast(`Ruta de ${longDate(state.routeDate)} generada.`, "route");
    });

    $("#queue-messages-button").addEventListener("click", () => {
      if (!isAdmin()) return;
      generateDailyRoute(state.routeDate, false);
      processMessageQueue();
      showView("messages");
      showToast(state.isOffline ? "Consultas en cola hasta recuperar conexión." : "Consultas generadas en la cola.", "message");
    });

    $("#client-day-picker").addEventListener("click", (event) => {
      const button = event.target.closest("[data-day]");
      if (!button) return;
      button.classList.toggle("active");
    });

    $("#client-save-button").addEventListener("click", saveClientFromForm);

    $("#role-switch").addEventListener("click", () => {
      state.role = isAdmin() ? "driver" : "admin";
      queueOperation("switch_demo_role", { role: state.role });
      saveState();
      renderAll();
      showView("more");
      showToast(state.role === "admin" ? "Modo administrador activado." : "Modo repartidor activado.", "check");
    });

    $("#route-search").addEventListener("input", (event) => {
      routeSearch = event.target.value;
      renderRouteList();
    });

    const toggleOffline = () => {
      state.isOffline = !state.isOffline;
      if (!state.isOffline) flushSyncQueue();
      queueOperation("connection_state", { offline: state.isOffline });
      saveState();
      renderAll();
      showToast(state.isOffline ? "Modo sin conexión activado." : "Conexión restablecida.", state.isOffline ? "alert" : "check");
    };

    $("#connection-toggle").addEventListener("click", toggleOffline);
    $("#offline-setting").addEventListener("click", toggleOffline);

    $("#notification-button").addEventListener("click", () => showToast("No hay nuevas notificaciones.", "bell"));
    $("#notification-setting").addEventListener("click", () => {
      state.notificationsEnabled = !state.notificationsEnabled;
      saveState();
      $("#notification-setting").querySelector(".toggle").classList.toggle("is-on", state.notificationsEnabled);
      showToast(state.notificationsEnabled ? "Notificaciones activadas." : "Notificaciones desactivadas.", "bell");
    });
    $("#notification-setting .toggle").classList.toggle("is-on", state.notificationsEnabled);

    $("#reset-demo").addEventListener("click", resetDemo);
    $("#sheet-deliver").addEventListener("click", registerDelivery);
    $("#sheet-confirm").addEventListener("click", () => updateStopStatus(activeStopId, "confirmed", "Confirmado manualmente"));
    $("#sheet-decline").addEventListener("click", () => updateStopStatus(activeStopId, "declined", "Marcado sin pedido"));
    $("#sheet-reminder").addEventListener("click", sendReminder);
    $("#sheet-reschedule").addEventListener("click", openRescheduleSheet);
    $("#reschedule-save").addEventListener("click", saveReschedule);
    $("#price-save").addEventListener("click", savePrices);
    $("#stock-movement-button").addEventListener("click", openMovementSheet);
    $("#movement-save").addEventListener("click", saveMovement);
    $("#movement-type-options").addEventListener("click", (event) => {
      const button = event.target.closest("[data-movement-type]");
      if (!button) return;
      activeMovementType = button.dataset.movementType;
      $$("[data-movement-type]", $("#movement-type-options")).forEach((item) => item.classList.toggle("active", item === button));
    });
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
  setupRealtime();
  bindEvents();
  renderAll();
  ensureCurrentDayRoute();
  window.setInterval(ensureCurrentDayRoute, 60_000);
})();
