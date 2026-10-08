create table public.perfis (
	id uuid primary key references auth.users(id) on delete cascade,
	nome text not null,
	papel text not null check (papel in ('atendente', 'admin')),
	ativo boolean not null default true,
	criado_em timestamptz not null default now()
);

create table public.vagas (
	id serial primary key,
	numero text not null unique,
	setor text,
	tipo text not null default 'comum'
		check (tipo in ('comum', 'pcd', 'idoso', 'gestante')),
	ativa boolean not null default true
);

create table public.veiculos (
	id serial primary key,
	placa text not null unique
		check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
	modelo text,
	cor text,
	categoria text
		check (categoria in ('aluno', 'professor', 'funcionario', 'visitante')),
	criado_em timestamptz not null default now()
);

create table public.movimentacoes (
	id bigserial primary key,
	vaga_id int not null references public.vagas(id),
	veiculo_id int not null references public.veiculos(id),
	entrada_em timestamptz not null default now(),
	saida_em timestamptz,
	atendente_entrada_id uuid not null references public.perfis(id),
	atendente_saida_id uuid references public.perfis(id),
	observacao text,
	check (saida_em is null or saida_em >= entrada_em)
);

create unique index uq_vaga_ocupada
	on public.movimentacoes(vaga_id)
	where saida_em is null;

create unique index uq_veiculo_no_patio
	on public.movimentacoes(veiculo_id)
	where saida_em is null;