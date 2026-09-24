-- AguaFlow · políticas RLS
-- Ejecutar después de schema.sql en un proyecto Supabase.

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.can_access_run(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.daily_runs
    where id = target_run_id
      and business_id = public.current_business_id()
      and (public.is_admin() or driver_id = auth.uid())
  );
$$;

create or replace function public.can_access_stop(target_stop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_stops s
    join public.daily_runs r on r.id = s.run_id
    where s.id = target_stop_id
      and r.business_id = public.current_business_id()
      and (public.is_admin() or r.driver_id = auth.uid())
  );
$$;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.client_default_items enable row level security;
alter table public.prices enable row level security;
alter table public.weekly_routes enable row level security;
alter table public.weekly_route_stops enable row level security;
alter table public.daily_runs enable row level security;
alter table public.daily_stops enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.vehicles enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.whatsapp_threads enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.message_jobs enable row level security;
alter table public.client_import_batches enable row level security;
alter table public.client_import_rows enable row level security;
alter table public.sync_operations enable row level security;
alter table public.reschedule_requests enable row level security;
alter table public.audit_logs enable row level security;

create policy businesses_select on public.businesses for select using (id = public.current_business_id() or public.is_admin());
create policy businesses_update_admin on public.businesses for update using (id = public.current_business_id() and public.is_admin()) with check (id = public.current_business_id() and public.is_admin());

create policy profiles_select on public.profiles for select using (business_id = public.current_business_id());
create policy profiles_update_self_or_admin on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (business_id = public.current_business_id() and (id = auth.uid() or public.is_admin()));

create policy clients_select on public.clients for select using (business_id = public.current_business_id());
create policy clients_admin_write on public.clients for all using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());

create policy products_select on public.products for select using (business_id = public.current_business_id());
create policy products_admin_write on public.products for all using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());

create policy client_defaults_select on public.client_default_items for select using (exists (select 1 from public.clients c where c.id = client_id and c.business_id = public.current_business_id()));
create policy client_defaults_admin_write on public.client_default_items for all using (public.is_admin() and exists (select 1 from public.clients c where c.id = client_id and c.business_id = public.current_business_id())) with check (public.is_admin() and exists (select 1 from public.clients c where c.id = client_id and c.business_id = public.current_business_id()));

create policy prices_select on public.prices for select using (business_id = public.current_business_id());
create policy prices_admin_write on public.prices for all using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());

create policy weekly_routes_select on public.weekly_routes for select using (business_id = public.current_business_id());
create policy weekly_routes_admin_write on public.weekly_routes for all using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());

create policy weekly_stops_select on public.weekly_route_stops for select using (exists (select 1 from public.weekly_routes r where r.id = route_id and r.business_id = public.current_business_id()));
create policy weekly_stops_admin_write on public.weekly_route_stops for all using (public.is_admin() and exists (select 1 from public.weekly_routes r where r.id = route_id and r.business_id = public.current_business_id())) with check (public.is_admin() and exists (select 1 from public.weekly_routes r where r.id = route_id and r.business_id = public.current_business_id()));

create policy daily_runs_select on public.daily_runs for select using (business_id = public.current_business_id() and public.can_access_run(id));
create policy daily_runs_admin_insert on public.daily_runs for insert with check (business_id = public.current_business_id() and public.is_admin());
create policy daily_runs_update on public.daily_runs for update using (business_id = public.current_business_id() and (public.is_admin() or driver_id = auth.uid())) with check (business_id = public.current_business_id() and (public.is_admin() or driver_id = auth.uid()));

create policy daily_stops_select on public.daily_stops for select using (public.can_access_stop(id));
create policy daily_stops_update on public.daily_stops for update using (public.can_access_stop(id)) with check (public.can_access_stop(id));
create policy daily_stops_admin_insert on public.daily_stops for insert with check (public.is_admin() and exists (select 1 from public.daily_runs r where r.id = run_id and r.business_id = public.current_business_id()));

create policy orders_select on public.orders for select using (public.can_access_stop(stop_id));
create policy orders_update on public.orders for update using (public.can_access_stop(stop_id)) with check (public.can_access_stop(stop_id));
create policy orders_admin_insert on public.orders for insert with check (public.is_admin() and public.can_access_stop(stop_id));

create policy order_items_select on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and public.can_access_stop(o.stop_id)));
create policy order_items_update on public.order_items for update using (exists (select 1 from public.orders o where o.id = order_id and public.can_access_stop(o.stop_id))) with check (exists (select 1 from public.orders o where o.id = order_id and public.can_access_stop(o.stop_id)));
create policy order_items_admin_write on public.order_items for all using (public.is_admin() and exists (select 1 from public.orders o where o.id = order_id and public.can_access_stop(o.stop_id))) with check (public.is_admin() and exists (select 1 from public.orders o where o.id = order_id and public.can_access_stop(o.stop_id)));

create policy vehicles_select on public.vehicles for select using (business_id = public.current_business_id());
create policy vehicles_admin_write on public.vehicles for all using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());

create policy stock_balances_select on public.stock_balances for select using (business_id = public.current_business_id());
create policy stock_balances_update on public.stock_balances for update using (business_id = public.current_business_id() and (public.is_admin() or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.driver_id = auth.uid()))) with check (business_id = public.current_business_id() and (public.is_admin() or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.driver_id = auth.uid())));

create policy stock_movements_select on public.stock_movements for select using (business_id = public.current_business_id());
create policy stock_movements_insert on public.stock_movements for insert with check (business_id = public.current_business_id() and (public.is_admin() or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.driver_id = auth.uid())));

create policy whatsapp_threads_select on public.whatsapp_threads for select using (business_id = public.current_business_id());
create policy whatsapp_messages_select on public.whatsapp_messages for select using (exists (select 1 from public.whatsapp_threads t where t.id = thread_id and t.business_id = public.current_business_id()));

create policy message_jobs_select on public.message_jobs for select using (business_id = public.current_business_id() and public.can_access_stop(stop_id));
create policy message_jobs_admin_write on public.message_jobs for all using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());

create policy import_batches_select on public.client_import_batches for select using (business_id = public.current_business_id() and public.is_admin());
create policy import_batches_admin_write on public.client_import_batches for all using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());
create policy import_rows_select on public.client_import_rows for select using (exists (select 1 from public.client_import_batches b where b.id = batch_id and b.business_id = public.current_business_id() and public.is_admin()));
create policy import_rows_admin_write on public.client_import_rows for all using (public.is_admin() and exists (select 1 from public.client_import_batches b where b.id = batch_id and b.business_id = public.current_business_id())) with check (public.is_admin() and exists (select 1 from public.client_import_batches b where b.id = batch_id and b.business_id = public.current_business_id()));

create policy sync_operations_select on public.sync_operations for select using (business_id = public.current_business_id() and created_by = auth.uid());
create policy sync_operations_insert on public.sync_operations for insert with check (business_id = public.current_business_id() and created_by = auth.uid());

create policy reschedule_select on public.reschedule_requests for select using (business_id = public.current_business_id());
create policy reschedule_insert on public.reschedule_requests for insert with check (business_id = public.current_business_id() and public.can_access_stop(original_stop_id));
create policy reschedule_admin_update on public.reschedule_requests for update using (business_id = public.current_business_id() and public.is_admin()) with check (business_id = public.current_business_id() and public.is_admin());

create policy audit_admin_select on public.audit_logs for select using (business_id = public.current_business_id() and public.is_admin());
