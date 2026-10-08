create or replace function public.is_ativo()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
	select exists (
		select 1
		from public.perfis
		where id = auth.uid() and ativo
	);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
	select exists (
		select 1
		from public.perfis
		where id = auth.uid() and ativo and papel = 'admin'
	);
$$;

revoke all on function public.is_ativo() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_ativo() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.perfis enable row level security;
alter table public.vagas enable row level security;
alter table public.veiculos enable row level security;
alter table public.movimentacoes enable row level security;

drop policy if exists perfis_select_ativos on public.perfis;
create policy perfis_select_ativos
	on public.perfis for select to authenticated
	using (public.is_ativo());

drop policy if exists perfis_insert_admin on public.perfis;
create policy perfis_insert_admin
	on public.perfis for insert to authenticated
	with check (public.is_admin());

drop policy if exists perfis_update_admin on public.perfis;
create policy perfis_update_admin
	on public.perfis for update to authenticated
	using (public.is_admin())
	with check (public.is_admin());

drop policy if exists perfis_delete_admin on public.perfis;
create policy perfis_delete_admin
	on public.perfis for delete to authenticated
	using (public.is_admin());

drop policy if exists vagas_select_ativos on public.vagas;
create policy vagas_select_ativos
	on public.vagas for select to authenticated
	using (public.is_ativo());

drop policy if exists vagas_insert_admin on public.vagas;
create policy vagas_insert_admin
	on public.vagas for insert to authenticated
	with check (public.is_admin());

drop policy if exists vagas_update_admin on public.vagas;
create policy vagas_update_admin
	on public.vagas for update to authenticated
	using (public.is_admin())
	with check (public.is_admin());

drop policy if exists vagas_delete_admin on public.vagas;
create policy vagas_delete_admin
	on public.vagas for delete to authenticated
	using (public.is_admin());

drop policy if exists veiculos_select_ativos on public.veiculos;
create policy veiculos_select_ativos
	on public.veiculos for select to authenticated
	using (public.is_ativo());

drop policy if exists movimentacoes_select_ativos on public.movimentacoes;
create policy movimentacoes_select_ativos
	on public.movimentacoes for select to authenticated
	using (public.is_ativo());

revoke all privileges on public.perfis, public.vagas,
	public.veiculos, public.movimentacoes, public.vagas_status
	from anon, public;
grant usage on schema public to authenticated;
grant select on public.perfis, public.vagas,
	public.veiculos, public.movimentacoes, public.vagas_status
	to authenticated;
grant insert, update, delete on public.perfis, public.vagas
	to authenticated;
grant usage, select on sequence public.vagas_id_seq to authenticated;