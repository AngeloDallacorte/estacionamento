import { supabase } from '../supabaseClient.js';
import { protegerRota, sair } from '../auth.js';

import {
  listarPerfis,
  alterarSituacaoUsuario,
  alterarPerfilUsuario
} from '../services/perfis.js';

const conteudo = document.getElementById('conteudo-admin');
const identificacao = document.getElementById('identificacao-perfil');
const botaoSair = document.getElementById('botao-sair');

const tabelaVagas = document.getElementById('tabela-vagas');
const mensagemVagas = document.getElementById('mensagem-vagas');
const botaoAtualizarVagas = document.getElementById('botao-atualizar-vagas');

const tabelaUsuarios = document.getElementById('tabela-usuarios');
const mensagemUsuarios = document.getElementById('mensagem-usuarios');
const botaoAtualizarUsuarios = document.getElementById('botao-atualizar-usuarios');

let usuarioAtualId = null;
let alteracaoEmAndamento = false;

function adicionarCelula(linha, valor) {
  const celula = document.createElement('td');
  celula.textContent = String(valor ?? '-');
  linha.appendChild(celula);
  return celula;
}

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
      adicionarCelula(linha, vaga.ocupada ? 'Ocupada' : 'Livre');

      tabelaVagas.appendChild(linha);
    }

    mensagemVagas.textContent =
      `${vagas.length} vaga(s) carregada(s).`;

  } catch (error) {
    mensagemVagas.textContent =
      'Não foi possível consultar as vagas.';
    console.error(error);
  }
}

function criarBotao(texto, acao) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.textContent = texto;
  botao.style.marginRight = '8px';
  botao.addEventListener('click', acao);
  return botao;
}

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
        usuario.papel === 'admin' ? 'Administrador' : 'Atendente'
      );
      adicionarCelula(
        linha,
        usuario.ativo ? 'Ativo' : 'Inativo'
      );

      const celulaAcoes = document.createElement('td');

      if (usuario.id === usuarioAtualId) {
        celulaAcoes.textContent = 'Sua conta';
      } else {
        const botaoSituacao = criarBotao(
          usuario.ativo ? 'Desativar' : 'Ativar',
          () => alterarSituacao(usuario)
        );

        const botaoPerfil = criarBotao(
          usuario.papel === 'admin' ? 'Rebaixar' : 'Promover',
          () => alterarPerfil(usuario)
        );

        celulaAcoes.appendChild(botaoSituacao);
        celulaAcoes.appendChild(botaoPerfil);
      }

      linha.appendChild(celulaAcoes);
      tabelaUsuarios.appendChild(linha);
    }

    mensagemUsuarios.textContent =
      `${usuarios.length} usuário(s) carregado(s).`;

  } catch (error) {
    mensagemUsuarios.textContent =
      'Não foi possível consultar os usuários.';
    console.error(error);
  }
}

function bloquearBotoes(bloquear) {
  botaoAtualizarUsuarios.disabled = bloquear;

  for (const botao of tabelaUsuarios.querySelectorAll('button')) {
    botao.disabled = bloquear;
  }
}

async function executarAlteracao(operacao) {
  if (alteracaoEmAndamento) return;

  alteracaoEmAndamento = true;
  bloquearBotoes(true);
  mensagemUsuarios.textContent = 'Salvando alteração...';

  try {
    await operacao();
    mensagemUsuarios.textContent = 'Alteração realizada com sucesso.';
  } catch (error) {
    alert(error.message);
    console.error(error);
  } finally {
    alteracaoEmAndamento = false;
    bloquearBotoes(false);
    await carregarUsuarios();
  }
}

async function alterarSituacao(usuario) {
  if (alteracaoEmAndamento || usuario.id === usuarioAtualId) return;

  const novaSituacao = !usuario.ativo;
  const acao = novaSituacao ? 'ativar' : 'desativar';

  if (!window.confirm(
    `Deseja realmente ${acao} o usuário "${usuario.nome}"?`
  )) return;

  await executarAlteracao(() =>
    alterarSituacaoUsuario(usuario.id, novaSituacao)
  );
}

async function alterarPerfil(usuario) {
  if (alteracaoEmAndamento || usuario.id === usuarioAtualId) return;

  const novoPapel =
    usuario.papel === 'admin' ? 'atendente' : 'admin';

  const acao =
    novoPapel === 'admin' ? 'promover' : 'rebaixar';

  if (!window.confirm(
    `Deseja realmente ${acao} o usuário "${usuario.nome}"?`
  )) return;

  await executarAlteracao(() =>
    alterarPerfilUsuario(usuario.id, novoPapel)
  );
}

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
    console.error(error);
    window.location.replace('painel.html');
  }
}

botaoSair.addEventListener('click', async () => {
  try {
    await sair();
  } catch (error) {
    alert(error.message);
  }
});

botaoAtualizarVagas.addEventListener('click', carregarVagas);
botaoAtualizarUsuarios.addEventListener('click', carregarUsuarios);

iniciar();
