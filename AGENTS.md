# AGENTS.md — Estacionamento ULBRA Torres

Instruções para agentes de IA (Claude Code, Cursor, Copilot, etc.) que trabalham neste repositório.
**Leia este arquivo inteiro e o `Tasks.md` antes de escrever qualquer código.**

---

## 1. Contexto do projeto

- **Disciplina:** Projeto de Desenvolvimento de Negócios (PDN) — ADS, ULBRA Torres.
- **Equipe:** Angelo, Dimitri e José Paulo. **Professor:** Juliano Ramos Matos.
- **Problema:** dificuldade de organizar e acompanhar o uso do estacionamento da ULBRA Torres nos horários de maior movimento.
- **Solução (versão atual):** sistema web de **controle de fluxo de entradas e saídas**, operado por um **atendente**. O atendente digita a **placa** do veículo e informa o **número da vaga** onde ele pode estacionar. Na saída, registra a saída pela placa.

> Mudança de escopo em relação à proposta inicial (AP1): **não há mapa de vagas** e **os motoristas não usam o sistema**. Quem usa é o atendente (e o administrador). Persona principal de operação: **atendente**. O Lucas (aluno) é o beneficiário final.

### Fora do escopo (não implementar, mesmo que pareça útil)

- Mapa/croqui visual de vagas, Google Maps, geolocalização.
- Sensores (ultrassônico/infravermelho) e IoT.
- Reserva de vagas, pagamento, cobrança.
- App para aluno/visitante, notificações, previsão de lotação.
- Backend próprio (Node, Express, etc.).

Se uma tarefa exigir algo disso, **pare e pergunte**.

---

## 2. Stack e arquitetura

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | HTML5, CSS3, **JavaScript vanilla** (ES Modules) | Sem framework, sem bundler, sem build step |
| Backend / BaaS | **Supabase** (Postgres + Auth + RLS + RPC) | O front conversa direto com o Supabase |
| Cliente Supabase | `@supabase/supabase-js` v2 via CDN (`cdn.jsdelivr.net`) | Importar como ES Module |
| Hospedagem | Hospedagem estática (GitHub Pages, Netlify ou Vercel) | A definir na tarefa T8.3 |

```
Atendente → Navegador (HTML/CSS/JS) ──HTTPS──► Supabase (Auth + Postgres + RLS + funções RPC)
```

**Não existe servidor de aplicação.** Toda regra de negócio crítica (validar vaga livre, evitar placa duplicada no pátio) deve ficar **no banco** (constraints, índices únicos, funções RPC), nunca só no JavaScript.

---

## 3. Estrutura de pastas

```
/
├── AGENTS.md
├── Tasks.md
├── README.md
├── index.html                 # Login
├── pages/
│   ├── painel.html            # Tela principal (entrada, saída, veículos no pátio)
│   ├── historico.html         # Histórico e filtros
│   └── admin.html             # Vagas e atendentes (somente admin)
├── css/
│   └── styles.css
├── js/
│   ├── config.js              # SUPABASE_URL e SUPABASE_ANON_KEY (anon, pública)
│   ├── supabaseClient.js      # createClient — único lugar que instancia o cliente
│   ├── auth.js                # login, logout, guarda de rota, papel do usuário
│   ├── services/              # Acesso a dados (única camada que chama o Supabase)
│   │   ├── movimentacoes.js
│   │   ├── vagas.js
│   │   └── perfis.js
│   ├── ui/                    # Manipulação de DOM (toasts, tabelas, modais)
│   ├── pages/                 # Um arquivo de entrada por página (painel.js, etc.)
│   └── utils/
│       ├── placa.js           # normalizar e validar placa
│       └── datas.js           # formatação de datas e duração
├── supabase/
│   ├── schema.sql             # Tabelas, índices, constraints
│   ├── policies.sql           # RLS
│   ├── functions.sql          # RPCs e views
│   └── seed.sql               # Vagas de exemplo
└── docs/
    └── (diagramas, roteiro de apresentação)
```

Regras de camadas:
- `pages/*.js` → chama `services/*` e `ui/*`.
- `services/*` → única camada que usa o cliente Supabase.
- `ui/*` e `utils/*` → nunca chamam o Supabase.

---

## 4. Modelo de dados

Esta é a versão **simplificada** do ER da equipe. Foram removidas as tabelas `sensor` e `reserva`, e a tabela `usuarios` virou `perfis` (ligada ao `auth.users` do Supabase, sem `senha_hash`). O arquivo `supabase/schema.sql` deve refletir exatamente o que está abaixo.

```sql
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('atendente','admin')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table vagas (
  id serial primary key,
  numero text not null unique,            -- ex.: 'A01', '12'
  setor text,
  tipo text not null default 'comum'
       check (tipo in ('comum','pcd','idoso','gestante')),
  ativa boolean not null default true
);

create table veiculos (
  id serial primary key,
  placa text not null unique
       check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),  -- antiga e Mercosul
  modelo text,
  cor text,
  categoria text check (categoria in ('aluno','professor','funcionario','visitante')),
  criado_em timestamptz not null default now()
);

create table movimentacoes (
  id bigserial primary key,
  vaga_id int not null references vagas(id),
  veiculo_id int not null references veiculos(id),
  entrada_em timestamptz not null default now(),
  saida_em timestamptz,
  atendente_entrada_id uuid not null references perfis(id),
  atendente_saida_id uuid references perfis(id),
  observacao text,
  check (saida_em is null or saida_em >= entrada_em)
);

-- Integridade garantida pelo banco:
create unique index uq_vaga_ocupada     on movimentacoes(vaga_id)    where saida_em is null;
create unique index uq_veiculo_no_patio on movimentacoes(veiculo_id) where saida_em is null;
```

**Cardinalidades:** Vaga 1:N Movimentação · Veículo 1:N Movimentação · Perfil 1:N Movimentação.

**Estado da vaga não é coluna.** Uma vaga está **ocupada** se existe movimentação com `saida_em is null` para ela. Crie a view `vagas_status` (vaga + `ocupada` + placa atual + `entrada_em`).

### Funções RPC (obrigatórias)

Ambas `security definer`, usando `auth.uid()` como atendente e verificando que o perfil está ativo. Retornam erros com mensagens claras em português.

- `registrar_entrada(p_placa text, p_vaga_numero text, p_categoria text default null, p_modelo text default null, p_cor text default null)`
  - Normaliza e valida a placa.
  - Cria o veículo se não existir (ou reaproveita o existente).
  - Falha se a vaga não existe, está inativa ou ocupada.
  - Falha se o veículo já está no pátio (informando em qual vaga).
  - Cria a movimentação com `entrada_em = now()`.
- `registrar_saida(p_placa text)`
  - Falha se não há movimentação aberta para a placa.
  - Preenche `saida_em = now()` e `atendente_saida_id`.
  - Retorna a movimentação com a duração da permanência.

---

## 5. Regras de negócio

1. Uma **vaga** só pode ter **um veículo** por vez.
2. Um **veículo** só pode estar em **uma vaga** por vez.
3. Placa é sempre guardada em **MAIÚSCULAS, sem hífen e sem espaços** (`ABC-1D23` → `ABC1D23`).
4. Formatos aceitos: antigo `ABC1234` e Mercosul `ABC1D23`.
5. Só vagas `ativa = true` podem receber veículos.
6. Movimentações **não são apagadas**. Elas são o histórico. Correções são feitas por `observacao` ou por ajuste do admin.
7. Atendente: registra entrada/saída e consulta pátio e histórico. Admin: tudo isso, mais gerenciar vagas e atendentes.
8. Tempo de permanência = `saida_em - entrada_em` (ou `now() - entrada_em` se ainda no pátio).

---

## 6. Segurança (obrigatório)

- **RLS ativado em todas as tabelas.** Nenhuma tabela pode ficar sem policy.
- Usuários autenticados e **ativos** podem `select`. Escrita em `movimentacoes` e `veiculos` **somente via RPC**. Escrita em `vagas` e `perfis` somente para `admin`.
- O front usa **apenas a `anon key`** (pública por design). **Nunca** colocar `service_role` no repositório ou no front.
- Não há cadastro público. O admin cria os atendentes (Supabase Auth) e o perfil correspondente.
- Nunca inserir HTML vindo do banco com `innerHTML`. Use `textContent` ou escape explícito.
- Não logar dados pessoais ou tokens no console em produção.
- Ocultar páginas por papel no front é **só conveniência**; a proteção real é a RLS.

---

## 7. Convenções de código

- **Idioma:** interface, mensagens e comentários em **português do Brasil**. Nomes de tabelas e colunas em português sem acento (seguindo o ER da equipe). Nomes de funções e variáveis JS em português ou inglês, mas **consistentes**; prefira português para termos de domínio (`placa`, `vaga`, `entrada`, `saida`).
- JavaScript: ES Modules, `const`/`let`, `async/await`, funções pequenas, sem dependências externas além do Supabase.
- Tratar **todo** retorno do Supabase: `const { data, error } = await ...; if (error) throw ...`.
- Mostrar erros de forma amigável ao atendente (toast ou mensagem inline), nunca só no console.
- CSS: um único `styles.css`, variáveis CSS para cores, layout responsivo (usado em celular e desktop).
- Acessibilidade mínima: `label` em todos os inputs, contraste adequado, foco visível, navegação por teclado.
- Formulário de placa: `autofocus`, caixa alta automática, `Enter` envia.
- Commits pequenos, em português, no formato `tipo: descrição` (ex.: `feat: registrar entrada de veículo`, `fix: validar placa mercosul`, `docs: atualizar Tasks.md`).

---

## 8. Como trabalhar (fluxo para a IA)

1. Abra o `Tasks.md` e escolha **a próxima tarefa não concluída** cujas dependências estejam prontas (ou a que o usuário indicar).
2. Trabalhe em **uma tarefa por vez**. Não antecipe tarefas futuras.
3. Antes de codar, diga em 2–4 linhas **o que vai fazer e quais arquivos vai tocar**.
4. Implemente o mínimo para cumprir os **critérios de aceite** da tarefa.
5. Explique como testar manualmente (passo a passo curto).
6. Marque a tarefa como `[x]` no `Tasks.md` apenas quando os critérios de aceite estiverem cumpridos.
7. Se houver ambiguidade de regra de negócio, **pergunte** em vez de inventar.
8. Se precisar mudar o modelo de dados, atualize **`supabase/*.sql` e a seção 4 deste arquivo** no mesmo passo.

### Definição de pronto (DoD)

- [ ] Critérios de aceite da tarefa cumpridos.
- [ ] Testado manualmente no navegador (caminho feliz **e** pelo menos um erro).
- [ ] Sem erros no console.
- [ ] Funciona em tela de celular (~375px) e desktop.
- [ ] RLS/RPC revisadas se a tarefa tocou no banco.
- [ ] `Tasks.md` atualizado.

---

## 9. Como rodar localmente

```bash
# Servir a pasta como site estático (qualquer um serve):
npx serve .
# ou
python3 -m http.server 5500
```

- ES Modules **não funcionam via `file://`**. Sempre use um servidor local.
- Configure `js/config.js` com `SUPABASE_URL` e `SUPABASE_ANON_KEY` do projeto.
- Aplique `supabase/schema.sql`, `functions.sql`, `policies.sql` e `seed.sql` no SQL Editor do Supabase, **nessa ordem**.

---

## 10. Observações sobre os documentos originais da equipe

Para evitar que a IA siga instruções antigas dos PDFs:

- **Ignorar:** Node.js, Express, AWS, Google Maps, tabelas `sensor` e `reserva`, status `reservada`, campos `latitude`/`longitude`.
- **Corrigir ao reaproveitar o SQL antigo:** as FKs apontavam para `usuario` (o nome correto era `usuarios`) e para tabelas criadas depois (`vaga`, `veiculo`, `sensor`). O `schema.sql` novo já resolve isso, com a ordem de criação correta.
- **Mantido da proposta:** persona/dor (perda de tempo e atraso), métricas-chave (tempo médio de procura, vagas disponíveis, histórico de ocupação) e histórico para identificar horários de maior movimento.
