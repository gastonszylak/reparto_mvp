-- AguaFlow · esquema inicial para Supabase/PostgreSQL
-- Ejecutar en una migración nueva y revisar las políticas RLS antes de producción.

create extension if not exists pgcrypto;

create type public.app_role as enum ('driver', 'admin');
create type public.route_status as enum ('planned', 'active', 'closed', 'cancelled');
create type public.stop_status as enum ('pending', 'in_progress', 'completed', 'skipped');
create type public.confirmation_status as enum ('pending', 'confirmed', 'declined', 'modified', 'no_answer', 'reschedule_requested');
create type public.order_status as enum ('draft', 'ready', 'out_for_delivery', 'partially_delivered', 'delivered', 'cancelled');
create type public.stock_movement_type as enum ('load', 'sale', 'return', 'adjustment', 'loss');
create type public.reschedule_status as enum ('requested', 'approved', 'rejected', 'completed');
create type public.message_job_status as enum ('pending', 'sending', 'sent', 'replied', 'failed', 'cancelled', 'skipped');
create type public.import_batch_status as enum ('preview', 'committed', 'failed');
create type public.sync_operation_status as enum ('pending', 'syncing', 'synced', 'failed');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  currency char(3) not null default 'ARS',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  role public.app_role not null default 'driver',
  full_name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  phone_e164 text,
  whatsapp_contact_id text,
  address text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  access_notes text,
  source_ref text,
  whatsapp_opt_in boolean not null default false,
  driver_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone_e164)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null check (kind in ('water_20l', 'water_12l', 'soda')),
  size_liters numeric(6, 2),
  unit text not null default 'unit',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create table public.client_default_items (
  client_id uuid not null references public.clients(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  primary key (client_id, product_id)
);

create table public.prices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  currency char(3) not null default 'ARS',
  valid_from date not null,
  valid_to date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);

create table public.weekly_routes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 6),
  name text not null,
  driver_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, weekday, name)
);

create table public.weekly_route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.weekly_routes(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  position integer not null check (position > 0),
  effective_from date not null default current_date,
  effective_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (route_id, client_id, effective_from)
);

create table public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  route_id uuid not null references public.weekly_routes(id) on delete restrict,
  service_date date not null,
  driver_id uuid references public.profiles(id) on delete set null,
  status public.route_status not null default 'planned',
  generated_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, service_date)
);

create table public.daily_stops (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  run_id uuid not null references public.daily_runs(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  position integer not null check (position > 0),
  stop_status public.stop_status not null default 'pending',
  confirmation_status public.confirmation_status not null default 'pending',
  exception_reason text,
  whatsapp_last_message_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, client_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  stop_id uuid not null unique references public.daily_stops(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  service_date date not null,
  status public.order_status not null default 'draft',
  confirmation_channel text not null default 'manual',
  total_snapshot numeric(12, 2) not null default 0,
  currency char(3) not null default 'ARS',
  confirmed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_requested integer not null default 0 check (quantity_requested >= 0),
  quantity_delivered integer not null default 0 check (quantity_delivered >= 0),
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  line_total_snapshot numeric(12, 2) not null default 0 check (line_total_snapshot >= 0),
  shortage_reason text,
  unique (order_id, product_id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  plate text,
  driver_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weekly_routes add column vehicle_id uuid references public.vehicles(id) on delete set null;
alter table public.daily_runs add column vehicle_id uuid references public.vehicles(id) on delete set null;

create table public.stock_balances (
  business_id uuid not null references public.businesses(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now(),
  primary key (vehicle_id, product_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity integer not null check (quantity > 0),
  order_id uuid references public.orders(id) on delete set null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.whatsapp_threads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  whatsapp_contact_id text not null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, whatsapp_contact_id)
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.whatsapp_threads(id) on delete cascade,
  provider_message_id text not null unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text not null,
  stable_action text,
  raw_payload jsonb not null default '{}'::jsonb,
  provider_status text,
  received_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.message_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  run_id uuid not null references public.daily_runs(id) on delete cascade,
  stop_id uuid not null references public.daily_stops(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_date date not null,
  kind text not null default 'daily_consultation',
  template_key text not null default 'daily_order_question',
  template_snapshot jsonb not null default '{}'::jsonb,
  status public.message_job_status not null default 'pending',
  scheduled_at timestamptz not null default now(),
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  provider_message_id text,
  last_error text,
  idempotency_key text not null,
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, idempotency_key)
);

create table public.client_import_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  filename text,
  source_hash text not null,
  status public.import_batch_status not null default 'preview',
  total_rows integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  error_rows integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  unique (business_id, source_hash)
);

create table public.client_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.client_import_batches(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb,
  status text not null default 'pending' check (status in ('pending', 'inserted', 'updated', 'duplicate', 'error')),
  error_message text,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  operation_id uuid not null,
  operation_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.sync_operation_status not null default 'pending',
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (business_id, operation_id)
);

create table public.reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  original_stop_id uuid not null references public.daily_stops(id) on delete cascade,
  requested_date date not null,
  reason text,
  status public.reschedule_status not null default 'requested',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  new_stop_id uuid references public.daily_stops(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  entity_name text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index daily_runs_date_idx on public.daily_runs (business_id, service_date, status);
create index daily_stops_run_status_idx on public.daily_stops (run_id, stop_status, confirmation_status);
create index orders_client_date_idx on public.orders (business_id, client_id, service_date);
create index whatsapp_messages_thread_idx on public.whatsapp_messages (thread_id, created_at desc);
create index stock_movements_vehicle_date_idx on public.stock_movements (vehicle_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_name, entity_id, created_at desc);
create index message_jobs_dispatch_idx on public.message_jobs (business_id, service_date, status, scheduled_at);
create index message_jobs_stop_idx on public.message_jobs (stop_id, service_date);
create index import_rows_batch_idx on public.client_import_rows (batch_id, row_number);
create index sync_operations_pending_idx on public.sync_operations (business_id, status, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger weekly_routes_updated_at before update on public.weekly_routes for each row execute function public.set_updated_at();
create trigger daily_runs_updated_at before update on public.daily_runs for each row execute function public.set_updated_at();
create trigger daily_stops_updated_at before update on public.daily_stops for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger reschedule_requests_updated_at before update on public.reschedule_requests for each row execute function public.set_updated_at();
create trigger message_jobs_updated_at before update on public.message_jobs for each row execute function public.set_updated_at();

-- Genera una jornada idempotente a partir de las plantillas semanales.
-- No modifica entregas ni pedidos ya existentes.
create or replace function public.generate_daily_runs(
  p_service_date date default current_date,
  p_business_id uuid default null
)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_weekday smallint := extract(isodow from p_service_date)::smallint;
  v_route record;
  v_route_stop record;
  v_client record;
  v_run_id uuid;
  v_stop_id uuid;
  v_order_id uuid;
  v_product_id uuid;
  v_price numeric(12, 2);
  v_quantity integer;
  v_total numeric(12, 2) := 0;
begin
  if v_business_id is null then
    raise exception 'business_id is required';
  end if;
  if v_weekday = 7 then
    return;
  end if;

  for v_route in
    select * from public.weekly_routes
    where business_id = v_business_id and weekday = v_weekday and active = true
  loop
    insert into public.daily_runs (business_id, route_id, service_date, driver_id, vehicle_id, status)
    values (v_business_id, v_route.id, p_service_date, v_route.driver_id, v_route.vehicle_id, 'planned')
    on conflict (route_id, service_date) do update
      set driver_id = coalesce(excluded.driver_id, public.daily_runs.driver_id),
          vehicle_id = coalesce(excluded.vehicle_id, public.daily_runs.vehicle_id),
          updated_at = now()
    returning id into v_run_id;

    for v_route_stop in
      select * from public.weekly_route_stops
      where route_id = v_route.id and active = true
        and effective_from <= p_service_date
        and (effective_to is null or effective_to >= p_service_date)
      order by position
    loop
      select * into v_client
      from public.clients
      where id = v_route_stop.client_id and business_id = v_business_id and active = true;
      if not found then
        continue;
      end if;

      insert into public.daily_stops (business_id, run_id, client_id, position)
      values (v_business_id, v_run_id, v_client.id, v_route_stop.position)
      on conflict (run_id, client_id) do nothing;
      select id into v_stop_id from public.daily_stops where run_id = v_run_id and client_id = v_client.id;
      if v_stop_id is null then
        continue;
      end if;

      insert into public.orders (business_id, stop_id, client_id, service_date, status)
      values (v_business_id, v_stop_id, v_client.id, p_service_date, 'draft')
      on conflict (stop_id) do nothing;
      select id into v_order_id from public.orders where stop_id = v_stop_id;
      if v_order_id is null then
        continue;
      end if;

      v_total := 0;
      for v_product_id, v_quantity in
        select di.product_id, di.quantity
        from public.client_default_items di
        where di.client_id = v_client.id and di.quantity > 0
      loop
        select unit_price into v_price
        from public.prices
        where product_id = v_product_id
          and valid_from <= p_service_date
          and (valid_to is null or valid_to >= p_service_date)
        order by valid_from desc
        limit 1;
        v_price := coalesce(v_price, 0);
        insert into public.order_items (order_id, product_id, quantity_requested, unit_price_snapshot, line_total_snapshot)
        values (v_order_id, v_product_id, v_quantity, v_price, v_price * v_quantity)
        on conflict (order_id, product_id) do nothing;
        v_total := v_total + (v_price * v_quantity);
      end loop;
      update public.orders set total_snapshot = v_total where id = v_order_id;
    end loop;
    return next v_run_id;
  end loop;
end;
$$;

grant execute on function public.generate_daily_runs(date, uuid) to authenticated, service_role;

-- Registra una entrega y descuenta stock en la misma transacción.
create or replace function public.register_delivery(
  p_operation_id uuid,
  p_stop_id uuid,
  p_items jsonb,
  p_business_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_stop record;
  v_order_id uuid;
  v_item jsonb;
  v_product_code text;
  v_quantity integer;
  v_product_id uuid;
  v_order_item record;
  v_vehicle_id uuid;
  v_on_hand integer;
  v_any_partial boolean := false;
  v_delivered jsonb := '[]'::jsonb;
begin
  if v_business_id is null then raise exception 'business_id is required'; end if;
  if exists (select 1 from public.sync_operations where business_id = v_business_id and operation_id = p_operation_id) then
    return jsonb_build_object('already_processed', true, 'operation_id', p_operation_id);
  end if;

  select s.*, r.driver_id, r.vehicle_id into v_stop
  from public.daily_stops s
  join public.daily_runs r on r.id = s.run_id
  where s.id = p_stop_id and s.business_id = v_business_id
  for update;
  if not found then raise exception 'stop_not_found'; end if;
  if auth.uid() is not null and not public.is_admin() and v_stop.driver_id <> auth.uid() then raise exception 'not_assigned_driver'; end if;

  select id into v_order_id from public.orders where stop_id = p_stop_id for update;
  if v_order_id is null then raise exception 'order_not_found'; end if;
  v_vehicle_id := v_stop.vehicle_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_product_code := upper(v_item->>'product_code');
    v_quantity := greatest(0, coalesce((v_item->>'quantity')::integer, 0));
    if v_quantity = 0 then continue; end if;
    select oi.id, oi.product_id, oi.quantity_requested into v_order_item
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order_id and p.code = v_product_code
    for update;
    if not found then raise exception 'product_not_in_order:%', v_product_code; end if;
    if v_vehicle_id is not null then
      select on_hand into v_on_hand from public.stock_balances where vehicle_id = v_vehicle_id and product_id = v_order_item.product_id for update;
      if coalesce(v_on_hand, 0) < v_quantity then raise exception 'insufficient_stock:%', v_product_code; end if;
      update public.stock_balances set on_hand = on_hand - v_quantity, updated_at = now() where vehicle_id = v_vehicle_id and product_id = v_order_item.product_id;
      insert into public.stock_movements (business_id, vehicle_id, product_id, movement_type, quantity, order_id, created_by)
      values (v_business_id, v_vehicle_id, v_order_item.product_id, 'sale', v_quantity, v_order_id, auth.uid());
    end if;
    update public.order_items set quantity_delivered = v_quantity where id = v_order_item.id;
    if v_quantity < v_order_item.quantity_requested then v_any_partial := true; end if;
    v_delivered := v_delivered || jsonb_build_array(jsonb_build_object('product_code', v_product_code, 'quantity', v_quantity));
  end loop;

  update public.orders
  set status = case when v_any_partial then 'partially_delivered' else 'delivered' end,
      delivered_at = now(), updated_at = now()
  where id = v_order_id;
  update public.daily_stops set stop_status = 'completed', confirmation_status = 'confirmed', completed_at = now(), updated_at = now() where id = p_stop_id;
  insert into public.sync_operations (business_id, operation_id, operation_type, payload, status, created_by, processed_at)
  values (v_business_id, p_operation_id, 'register_delivery', p_items, 'synced', auth.uid(), now());
  insert into public.audit_logs (business_id, entity_name, entity_id, action, after_data, actor_id)
  values (v_business_id, 'daily_stop', p_stop_id, 'delivery_registered', p_items, auth.uid());
  return jsonb_build_object('order_id', v_order_id, 'delivered', v_delivered, 'partial', v_any_partial);
end;
$$;

grant execute on function public.register_delivery(uuid, uuid, jsonb, uuid) to authenticated, service_role;

-- Las políticas RLS deben habilitarse antes de exponer estas tablas a la app.
-- El service role de Supabase no debe enviarse nunca al dispositivo móvil.
