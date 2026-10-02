# Tasks.md — Estacionamento ULBRA Torres

Plano de trabalho do projeto. Leia o `AGENTS.md` antes de começar.

**Legenda:** `[ ]` pendente · `[x]` concluída · **Dep.** = depende de · **MoSCoW** conforme a AP1.

**Regra:** uma tarefa por vez, cumprindo os critérios de aceite antes de marcar `[x]`.

---

## Visão do MVP

O atendente faz login, digita a **placa** e o **número da vaga**, registra a **entrada**. Quando o carro sai, registra a **saída** pela placa. A tela principal mostra os **veículos no pátio**, quantas vagas estão livres e ocupadas e há um **histórico** consultável.

**Fluxo principal:**
`Login → Painel → Registrar entrada (placa + vaga) → Veículo aparece no pátio → Registrar saída (placa) → Vaga liberada → Histórico`

---

## Fase 0 — Preparação

- [ ] **T0.1 — Criar repositório e estrutura de pastas** *(Must)*
  - Criar a estrutura descrita no `AGENTS.md` (seção 3) com arquivos vazios/esqueleto.
  - Criar `README.md` com nome do projeto, equipe e como rodar.
  - **Aceite:** `npx serve .` abre `index.html` sem erros no console.

- [ ] **T0.2 — Criar projeto no Supabase** *(Must)*
  - Criar o projeto, anotar URL e `anon key`.
  - Desativar cadastro público (Auth → Providers → Email → desligar "Allow new users to sign up").
  - **Aceite:** `js/config.js` preenchido; `service_role` **não** aparece em nenhum arquivo.

- [ ] **T0.3 — Cliente Supabase no front** *(Must)* · Dep.: T0.1, T0.2
  - Criar `js/supabaseClient.js` importando o `supabase-js` v2 via CDN como ES Module.
  - **Aceite:** um `console.log` temporário confirma que o cliente é criado (remover depois).

---

## Fase 1 — Banco de dados

- [ ] **T1.1 — Schema** *(Must)* · Dep.: T0.2
  - Criar `supabase/schema.sql` exatamente como na seção 4 do `AGENTS.md` (tabelas, checks, índices únicos parciais).
  - **Aceite:** script roda sem erro do zero; tentar inserir duas movimentações abertas para a mesma vaga **ou** mesmo veículo falha.

- [ ] **T1.2 — View `vagas_status`** *(Must)* · Dep.: T1.1
  - View com: `vaga_id`, `numero`, `setor`, `tipo`, `ativa`, `ocupada` (boolean), `placa_atual`, `entrada_em`.
  - **Aceite:** `select * from vagas_status` mostra corretamente vagas livres e ocupadas.

- [ ] **T1.3 — RPC `registrar_entrada`** *(Must)* · Dep.: T1.1
  - Conforme `AGENTS.md` seção 4: normaliza placa, cria/reaproveita veículo, valida vaga e duplicidade.
  - **Aceite (testar no SQL Editor):**
    - Entrada válida cria a movimentação.
    - Vaga ocupada → erro claro.
    - Vaga inexistente ou inativa → erro claro.
    - Placa já no pátio → erro informando a vaga atual.
    - Placa inválida → erro claro.
    - `abc-1d23` é gravada como `ABC1D23`.

- [ ] **T1.4 — RPC `registrar_saida`** *(Must)* · Dep.: T1.3
  - **Aceite:** fecha a movimentação aberta; placa sem entrada aberta → erro claro; vaga volta a aparecer como livre.

- [ ] **T1.5 — Políticas RLS** *(Must)* · Dep.: T1.1
  - Criar funções auxiliares `is_ativo()` e `is_admin()`.
  - `select` para autenticados ativos; escrita em `movimentacoes`/`veiculos` só via RPC; escrita em `vagas`/`perfis` só admin.
  - **Aceite:** com a `anon key` **sem login**, nenhuma tabela retorna dados; atendente não consegue `insert` direto em `movimentacoes`.

- [ ] **T1.6 — Seed de vagas** *(Must)* · Dep.: T1.1
  - Criar `supabase/seed.sql` com ~20 vagas de exemplo (incluindo algumas PCD/idoso/gestante).
  - **Aceite:** `select count(*) from vagas` retorna o esperado.

---

## Fase 2 — Autenticação

- [ ] **T2.1 — Criar usuários de teste** *(Must)* · Dep.: T1.5
  - Criar 1 admin e 1 atendente no Supabase Auth e inserir os respectivos `perfis`.
  - **Aceite:** ambos existem em `auth.users` e `perfis` com o papel correto.

- [ ] **T2.2 — Tela de login** *(Must)* · Dep.: T0.3, T2.1
  - `index.html` com e-mail e senha, mensagem de erro amigável, botão com estado de carregamento.
  - **Aceite:** login válido redireciona para `pages/painel.html`; inválido mostra erro sem recarregar.

- [ ] **T2.3 — Guarda de rota e logout** *(Must)* · Dep.: T2.2
  - `js/auth.js`: se não houver sessão, redireciona para o login; se perfil inativo, desloga; botão "Sair".
  - Expor o papel (`atendente`/`admin`) para esconder itens de menu.
  - **Aceite:** abrir `painel.html` deslogado leva ao login; perfil inativo não entra; "Sair" encerra a sessão.

---

## Fase 3 — Registrar entrada (núcleo do sistema)

- [ ] **T3.1 — Utilitário de placa** *(Must)* · Dep.: T0.1
  - `js/utils/placa.js`: `normalizarPlaca()` e `validarPlaca()` (antiga e Mercosul).
  - **Aceite:** `abc-1234`, `ABC 1D23`, `abc1d23` normalizam corretamente; `AB1234`, `ABCD123` são inválidas.

- [ ] **T3.2 — Service de movimentações** *(Must)* · Dep.: T1.3, T1.4
  - `js/services/movimentacoes.js` com `registrarEntrada()`, `registrarSaida()`, `listarNoPatio()`, `listarHistorico()`.
  - **Aceite:** funções retornam dados ou lançam erros com mensagem em português vinda da RPC.

- [ ] **T3.3 — Formulário "Registrar entrada"** *(Must)* · Dep.: T2.3, T3.1, T3.2
  - Campos: placa (caixa alta automática), número da vaga, categoria (opcional), modelo e cor (opcionais).
  - Validação no front antes de enviar; sucesso mostra toast "Entrada registrada: ABC1D23 → vaga A05"; limpa o formulário e devolve o foco para a placa.
  - **Aceite:** caminho feliz funciona; os erros de vaga ocupada, placa duplicada e placa inválida aparecem de forma clara; `Enter` envia.

- [ ] **T3.4 — Lista de vagas livres para apoio** *(Should)* · Dep.: T1.2, T3.3
  - Ao lado do formulário, mostrar a lista simples de números de vagas **livres** (sem mapa). Clicar em um número preenche o campo da vaga.
  - Opcional: botão "Sugerir vaga" que preenche a primeira livre (filtrando por tipo, se informado).
  - **Aceite:** a lista reflete o estado real e atualiza após cada entrada ou saída.

---

## Fase 4 — Registrar saída

- [ ] **T4.1 — Formulário "Registrar saída"** *(Must)* · Dep.: T3.2, T2.3
  - Campo placa; ao confirmar, chama `registrar_saida` e mostra "Saída registrada: ABC1D23 — permaneceu 2h 15min".
  - **Aceite:** placa sem entrada aberta mostra erro claro; saída libera a vaga na lista de livres.

- [ ] **T4.2 — Saída com um clique pela lista do pátio** *(Should)* · Dep.: T4.1, T5.1
  - Botão "Registrar saída" em cada linha da tabela de veículos no pátio, com confirmação.
  - **Aceite:** clique + confirmação registra a saída e atualiza a tabela.

---

## Fase 5 — Painel

- [ ] **T5.1 — Tabela "Veículos no pátio"** *(Must)* · Dep.: T3.2
  - Colunas: placa, vaga, categoria, entrada, tempo decorrido. Ordenada pela entrada mais recente.
  - **Aceite:** reflete as movimentações abertas; mostra estado vazio amigável quando não há veículos.

- [ ] **T5.2 — Contadores de ocupação** *(Must)* · Dep.: T1.2
  - Cartões: total de vagas ativas, **ocupadas**, **livres** e % de ocupação.
  - **Aceite:** números batem com o banco após cada entrada ou saída.

- [ ] **T5.3 — Busca por placa** *(Should)* · Dep.: T5.1
  - Campo que filtra o pátio por placa parcial e mostra a vaga do veículo.
  - **Aceite:** digitar `1D2` filtra a lista em tempo real.

- [ ] **T5.4 — Atualização automática** *(Should)* · Dep.: T5.1, T5.2
  - Atualizar os dados periodicamente (ex.: a cada 30 s) **ou** usar Supabase Realtime, para que mais de um atendente veja o mesmo estado.
  - **Aceite:** uma entrada feita em uma aba aparece na outra sem recarregar.

---

## Fase 6 — Histórico

- [ ] **T6.1 — Página de histórico** *(Should)* · Dep.: T3.2
  - Tabela paginada de movimentações com placa, vaga, entrada, saída, duração e atendente.
  - **Aceite:** mostra movimentações abertas e fechadas; paginação funciona.

- [ ] **T6.2 — Filtros** *(Should)* · Dep.: T6.1
  - Filtrar por período, placa e vaga.
  - **Aceite:** combinar filtros retorna o resultado correto.

- [ ] **T6.3 — Indicadores simples de movimento** *(Could)* · Dep.: T6.1
  - Entradas por hora do dia e tempo médio de permanência (usar uma query/view SQL e exibir em lista ou barras CSS simples, sem biblioteca de gráficos).
  - **Aceite:** identifica os horários de maior movimento (métrica da proposta).

- [ ] **T6.4 — Exportar CSV** *(Could)* · Dep.: T6.2
  - **Aceite:** baixa um `.csv` respeitando os filtros atuais.

---

## Fase 7 — Administração (somente admin)

- [ ] **T7.1 — Gerenciar vagas** *(Should)* · Dep.: T2.3, T1.5
  - Criar, editar (setor/tipo) e ativar/desativar vagas. Não permitir excluir vaga que tenha histórico.
  - **Aceite:** atendente não acessa a página (front **e** RLS); vaga desativada some das opções de entrada.

- [ ] **T7.2 — Gerenciar atendentes** *(Could)* · Dep.: T7.1
  - Listar perfis e ativar/desativar. Criar o usuário no Supabase Auth continua manual, documentado no README.
  - **Aceite:** atendente desativado não consegue mais usar o sistema.

- [ ] **T7.3 — Corrigir lançamento errado** *(Could)* · Dep.: T5.1
  - Admin pode editar a vaga de uma movimentação aberta ou cancelar um lançamento feito por engano, **com observação obrigatória** (nada de delete físico).
  - **Aceite:** a correção fica registrada no histórico.

---

## Fase 8 — Qualidade, UX e publicação

- [ ] **T8.1 — Responsividade e acessibilidade** *(Must)* · Dep.: Fases 3–5
  - Testar em ~375px e desktop; labels, foco visível e navegação por teclado.
  - **Aceite:** painel utilizável no celular sem rolagem horizontal.

- [ ] **T8.2 — Roteiro de testes manuais** *(Must)* · Dep.: Fases 3–5
  - Criar `docs/testes.md` com casos: entrada ok, vaga ocupada, placa duplicada, placa inválida, saída ok, saída sem entrada, acesso sem login, atendente tentando abrir a administração.
  - **Aceite:** todos os casos executados e registrados como passou ou falhou.

- [ ] **T8.3 — Publicar o front** *(Must)* · Dep.: T8.1
  - Escolher e configurar hospedagem estática (GitHub Pages, Netlify ou Vercel).
  - **Aceite:** URL pública funcionando e login operando em produção.

- [ ] **T8.4 — Revisão de segurança** *(Must)* · Dep.: T8.3
  - Conferir: RLS em todas as tabelas, ausência de `service_role` no repositório, ausência de `innerHTML` com dados do banco, cadastro público desligado.
  - **Aceite:** checklist preenchido no `README.md`.

- [ ] **T8.5 — README final** *(Must)* · Dep.: T8.3
  - Descrição, arquitetura (diagrama simples), como configurar o Supabase, como rodar localmente, usuários de teste e limitações.
  - **Aceite:** outra pessoa consegue subir o projeto seguindo só o README.

---

## Fase 9 — Entrega da disciplina (PDN)

- [ ] **T9.1 — Atualizar o diagrama de arquitetura** *(Must)*
  - Novo diagrama: Atendente → Navegador (HTML/CSS/JS) → Supabase (Auth + Postgres). Sem Node, AWS ou Google Maps.
  - **Aceite:** diagrama exportado em `docs/`.

- [ ] **T9.2 — Atualizar o ER** *(Must)*
  - Diagrama com `perfis`, `vagas`, `veiculos`, `movimentacoes` e as cardinalidades da seção 4 do `AGENTS.md`.
  - **Aceite:** coerente com o `schema.sql`.

- [ ] **T9.3 — Atualizar Lean Canvas, MoSCoW e histórias de usuário** *(Must)*
  - Ajustar ao novo escopo: o atendente é o usuário operador, sem mapa, com controle de fluxo. Reescrever as histórias, por exemplo: *"Como atendente, quero registrar a entrada informando placa e vaga, para controlar quais vagas estão ocupadas."*
  - **Aceite:** documentos da AP1 coerentes com o sistema real.

- [ ] **T9.4 — Medir o ganho (evidência)** *(Should)*
  - Comparar o controle manual (papel ou "de cabeça") com o sistema: tempo para registrar uma entrada e uma saída (ex.: 10 registros cada).
  - **Aceite:** tabela com tempos médios para usar na apresentação.

- [ ] **T9.5 — Roteiro e ensaio da apresentação (~8 min)** *(Must)*
  - Demo ao vivo: login → entrada → pátio → saída → histórico. Ter um plano B (vídeo ou prints).
  - **Aceite:** ensaio cronometrado dentro do tempo.

---

## Backlog futuro (fora do MVP)

- [ ] Notificação quando a lotação passar de um limite *(Could)*
- [ ] Previsão de lotação com base no histórico *(Could)*
- [ ] Leitura de placa por câmera (OCR) *(Won't — futuro)*
- [ ] Mapa visual de vagas *(Won't — decisão de escopo)*
- [ ] Reserva e pagamento *(Won't)*

---

## Ordem sugerida de execução

`T0.1 → T0.2 → T0.3 → T1.1 → T1.2 → T1.3 → T1.4 → T1.5 → T1.6 → T2.1 → T2.2 → T2.3 → T3.1 → T3.2 → T3.3 → T4.1 → T5.1 → T5.2 → T8.1 → T8.2 → T8.3`

Esse é o **MVP demonstrável**. O restante (Should e Could) entra conforme sobrar tempo, e as tarefas T9.x são feitas em paralelo.

---

## Registro de decisões

| Data | Decisão | Motivo |
|---|---|---|
| — | Sem backend próprio; front direto no Supabase | Simplicidade e menor custo; regras críticas no banco (RPC + RLS) |
| — | Sem mapa de vagas | Escopo reduzido; atendente informa o número da vaga |
| — | Estado da vaga derivado de `movimentacoes` | Evita inconsistência entre vaga e movimentação |
| — | Removidas as tabelas `sensor` e `reserva` | Fora do escopo do MVP |
