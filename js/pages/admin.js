import { supabase } from '../supabaseClient.js';
import { protegerRota, sair } from '../auth.js';

import {
  listarPerfis,
  alterarSituacaoUsuario
} from '../services/perfis.js';

const conteudo = document.getElementById('conteudo-admin');
const identificacao = document.getElementById('identificacao-perfil');
const botaoSair = document.getElementById('botao-sair');

const tabelaVagas = document.getElementById('tabela-vagas');
const mensagemVagas = document.getElementById('mensagem-vagas');
const botaoAtualizarVagas =
  document.getElementById('botao-atualizar-vagas');

const tabelaUsuarios = document.getElementById('tabela-usuarios');
const mensagemUsuarios = document.getElementById('mensagem-usuarios');
const botaoAtualizarUsuarios =
  document.getElementById('botao-atualizar-usuarios');

let usuarioAtualId = null;
let alteracaoEmAndamento = false;

// Cria células de texto com segurança.
function adicionarCelula(linha, valor) {
  const celula = document.createElement('td');
  celula.textContent = String(valor ?? '-');
  linha.appendChild(celula);
  return celula;
}

// Carrega as vagas.
async function carregarVagas() {
  mensagemVagas.textContent = 'Carregando vagas...';
  tabelaVagas.replaceChildren();

  try {
    const { data, error } = await supabase
      .from('vagas_status')
      .select('*')
      .order('numero');

    if (error) throw error;

    const vagas = data ?? [];

    for (const vaga of vagas) {
      const linha = document.createElement('tr');

      adicionarCelula(linha, vaga.numero);
      adicionarCelula(linha, vaga.setor ?? '-');
      adicionarCelula(linha, vaga.tipo ?? '-');
      adicionarCelula(
        linha,
        vaga.ocupada ? 'Ocupada' : 'Livre'
      );

      tabelaVagas.appendChild(linha);
    }

    mensagemVagas.textContent =
      `${vagas.length} vaga(s) carregada(s).`;

  } catch (error) {
    mensagemVagas.textContent =
      'Não foi possível consultar as vagas.';

    console.error('Erro ao carregar vagas:', error);
  }
}

// Carrega os usuários e cria os botões.
async function carregarUsuarios() {
  if (alteracaoEmAndamento) return;

  mensagemUsuarios.textContent = 'Carregando usuários...';
  tabelaUsuarios.replaceChildren();

  try {
    const usuarios = await listarPerfis();

    for (const usuario of usuarios) {
      const linha = document.createElement('tr');

      adicionarCelula(linha, usuario.nome);

      adicionarCelula(
        linha,
        usuario.papel === 'admin'
          ? 'Administrador'
          : 'Atendente'
      );

      adicionarCelula(
        linha,
        usuario.ativo ? 'Ativo' : 'Inativo'
      );

      const celulaAcao = document.createElement('td');

      if (usuario.id === usuarioAtualId) {
        celulaAcao.textContent = 'Sua conta';
      } else {
        const botao = document.createElement('button');

        botao.type = 'button';
        botao.textContent = usuario.ativo
          ? 'Desativar'
          : 'Ativar';

        botao.addEventListener('click', () => {
          alterarUsuario(usuario);
        });

        celulaAcao.appendChild(botao);
      }

      linha.appendChild(celulaAcao);
      tabelaUsuarios.appendChild(linha);
    }

    mensagemUsuarios.textContent =
      `${usuarios.length} usuário(s) carregado(s).`;

  } catch (error) {
    mensagemUsuarios.textContent =
      'Não foi possível consultar os usuários.';

    console.error('Erro ao carregar usuários:', error);
  }
}

// Altera a situação de um usuário.
async function alterarUsuario(usuario) {
  if (alteracaoEmAndamento) return;

  if (usuario.id === usuarioAtualId) {
    alert('Você não pode desativar sua própria conta.');
    return;
  }

  const novaSituacao = !usuario.ativo;
  const acao = novaSituacao ? 'ativar' : 'desativar';

  const confirmado = window.confirm(
    `Deseja realmente ${acao} o usuário "${usuario.nome}"?`
  );

  if (!confirmado) return;

  alteracaoEmAndamento = true;
  botaoAtualizarUsuarios.disabled = true;

  const botoes = tabelaUsuarios.querySelectorAll('button');

  for (const botao of botoes) {
    botao.disabled = true;
  }

  mensagemUsuarios.textContent =
    `Aguarde, tentando ${acao} o usuário...`;

  try {
    await alterarSituacaoUsuario(
      usuario.id,
      novaSituacao
    );

    mensagemUsuarios.textContent =
      'Situação alterada com sucesso.';

    // Atualiza a tabela com os dados do banco.
  } catch (error) {
    alert(error.message);

    console.error(
      'Erro ao alterar situação do usuário:',
      error
    );
  } finally {
    alteracaoEmAndamento = false;
    botaoAtualizarUsuarios.disabled = false;

    await carregarUsuarios();
  }
}

// Inicialização da administração.
async function iniciar() {
  try {
    const perfil = await protegerRota();

    if (!perfil) return;

    if (perfil.papel !== 'admin') {
      window.location.replace('painel.html');
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw new Error('Sessão inválida.');
    }

    usuarioAtualId = data.user.id;

    identificacao.textContent =
      `${perfil.nome} · ${perfil.papel}`;

    conteudo.hidden = false;

    await Promise.all([
      carregarVagas(),
      carregarUsuarios()
    ]);

  } catch (error) {
    console.error(
      'Erro ao iniciar administração:',
      error
    );

    window.location.replace('painel.html');
  }
}

// Botão sair.
botaoSair.addEventListener('click', async () => {
  try {
    await sair();
  } catch (error) {
    alert(error.message);
  }
});

// Atualização das tabelas.
botaoAtualizarVagas.addEventListener(
  'click',
  carregarVagas
);

botaoAtualizarUsuarios.addEventListener(
  'click',
  carregarUsuarios
);

iniciar();
