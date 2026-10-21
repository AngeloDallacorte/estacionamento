create or replace view public.vagas_status
with (security_invoker = true)
as
select
	v.id as vaga_id,
	v.numero,
	v.setor,
	v.tipo,
	v.ativa,
	(m.id is not null) as ocupada,
	ve.placa as placa_atual,
	m.entrada_em
from public.vagas as v
left join public.movimentacoes as m
	on m.vaga_id = v.id and m.saida_em is null
left join public.veiculos as ve
	on ve.id = m.veiculo_id;

create or replace function public.registrar_entrada(
	p_placa text,
	p_vaga_numero text,
	p_categoria text default null,
	p_modelo text default null,
	p_cor text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_usuario_id uuid := auth.uid();
	v_placa text := regexp_replace(upper(coalesce(p_placa, '')), '[[:space:]-]', '', 'g');
	v_categoria text := nullif(lower(btrim(p_categoria)), '');
	v_vaga public.vagas%rowtype;
	v_veiculo public.veiculos%rowtype;
	v_movimentacao public.movimentacoes%rowtype;
	v_vaga_atual text;
begin
	if v_usuario_id is null then
		raise exception 'Sessão inválida. Entre novamente no sistema.';
	end if;

	if not exists (
		select 1 from public.perfis
		where id = v_usuario_id and ativo
	) then
		raise exception 'Perfil inexistente ou inativo. Procure um administrador.';
	end if;

	if v_placa !~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$' then
		raise exception 'Placa inválida. Informe uma placa antiga ou Mercosul.';
	end if;

	if p_vaga_numero is null or btrim(p_vaga_numero) = '' then
		raise exception 'Informe o número da vaga.';
	end if;

	if v_categoria is not null and v_categoria not in (
		'aluno', 'professor', 'funcionario', 'visitante'
	) then
		raise exception 'Categoria inválida.';
	end if;

	select * into v_vaga
	from public.vagas
	where numero = btrim(p_vaga_numero)
	for update;

	if not found then
		raise exception 'A vaga % não existe.', btrim(p_vaga_numero);
	end if;

	if not v_vaga.ativa then
		raise exception 'A vaga % está inativa.', v_vaga.numero;
	end if;

	insert into public.veiculos (placa, categoria, modelo, cor)
	values (
		v_placa,
		v_categoria,
		nullif(btrim(p_modelo), ''),
		nullif(btrim(p_cor), '')
	)
	on conflict (placa) do nothing
	returning * into v_veiculo;

	if not found then
		select * into v_veiculo
		from public.veiculos
		where placa = v_placa
		for update;
	end if;

	select va.numero into v_vaga_atual
	from public.movimentacoes as m
	join public.vagas as va on va.id = m.vaga_id
	where m.veiculo_id = v_veiculo.id and m.saida_em is null;

	if found then
		raise exception 'Veículo % já está no pátio na vaga %.', v_placa, v_vaga_atual;
	end if;

	if exists (
		select 1 from public.movimentacoes
		where vaga_id = v_vaga.id and saida_em is null
	) then
		raise exception 'A vaga % já está ocupada.', v_vaga.numero;
	end if;

	insert into public.movimentacoes (vaga_id, veiculo_id, atendente_entrada_id)
	values (v_vaga.id, v_veiculo.id, v_usuario_id)
	returning * into v_movimentacao;

	return to_jsonb(v_movimentacao) || jsonb_build_object(
		'placa', v_placa,
		'vaga_numero', v_vaga.numero
	);
exception
	when unique_violation then
		select va.numero into v_vaga_atual
		from public.movimentacoes as m
		join public.vagas as va on va.id = m.vaga_id
		where m.veiculo_id = v_veiculo.id and m.saida_em is null;

		if found then
			raise exception 'Veículo % já está no pátio na vaga %.', v_placa, v_vaga_atual;
		end if;

		raise exception 'A vaga % acabou de ser ocupada. Atualize a lista e tente novamente.',
			v_vaga.numero;
end;
$$;

create or replace function public.registrar_saida(p_placa text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_usuario_id uuid := auth.uid();
	v_placa text := regexp_replace(upper(coalesce(p_placa, '')), '[[:space:]-]', '', 'g');
	v_movimentacao public.movimentacoes%rowtype;
	v_duracao interval;
begin
	if v_usuario_id is null then
		raise exception 'Sessão inválida. Entre novamente no sistema.';
	end if;

	if not exists (
		select 1 from public.perfis
		where id = v_usuario_id and ativo
	) then
		raise exception 'Perfil inexistente ou inativo. Procure um administrador.';
	end if;

	if v_placa !~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$' then
		raise exception 'Placa inválida. Informe uma placa antiga ou Mercosul.';
	end if;

	select m.* into v_movimentacao
	from public.movimentacoes as m
	join public.veiculos as ve on ve.id = m.veiculo_id
	where ve.placa = v_placa and m.saida_em is null
	for update of m;

	if not found then
		raise exception 'Não há entrada em aberto para a placa %.', v_placa;
	end if;

	update public.movimentacoes
	set saida_em = now(), atendente_saida_id = v_usuario_id
	where id = v_movimentacao.id
	returning * into v_movimentacao;

	v_duracao := v_movimentacao.saida_em - v_movimentacao.entrada_em;

	return to_jsonb(v_movimentacao) || jsonb_build_object(
		'placa', v_placa,
		'duracao', v_duracao
	);
end;
$$;

revoke all on function public.registrar_entrada(text, text, text, text, text)
	from public, anon;
revoke all on function public.registrar_saida(text)
	from public, anon;
grant execute on function public.registrar_entrada(text, text, text, text, text)
	to authenticated;
grant execute on function public.registrar_saida(text)
	to authenticated;