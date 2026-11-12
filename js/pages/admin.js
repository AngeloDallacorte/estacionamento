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

const formularioCadastro = document.getElementById('formulario-cadastrar-usuario');
const mensagemCadastro = document.getElementById('mensagem-cadastro-usuario');
const botaoCadastrar = document.getElementById('botao-cadastrar-usuario');

let usuarioAtualId = null;
let alteracaoEmAndamento = false;
let cadastroEmAndamento = false;

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

async function cadastrarUsuario(evento) {
  evento.preventDefault();

  if (cadastroEmAndamento) return;

  const nome = document.getElementById('cadastro-nome').value.trim();
  const email = document.getElementById('cadastro-email').value.trim().toLowerCase();
  const senha = document.getElementById('cadastro-senha').value;
  const confirmarSenha = document.getElementById('cadastro-confirmar-senha').value;
  const papel = document.getElementById('cadastro-papel').value;

  if (!nome || !email || !senha || !confirmarSenha) {
    mensagemCadastro.textContent = 'Preencha todos os campos.';
    return;
  }

  if (senha.length < 8) {
    mensagemCadastro.textContent =
      'A senha deve possuir pelo menos 8 caracteres.';
    return;
  }

  if (senha !== confirmarSenha) {
    mensagemCadastro.textContent = 'As senhas não coincidem.';
    return;
  }

  if (!['atendente', 'admin'].includes(papel)) {
    mensagemCadastro.textContent = 'Perfil de acesso inválido.';
    return;
  }

  cadastroEmAndamento = true;
  botaoCadastrar.disabled = true;
  botaoCadastrar.textContent = 'Cadastrando...';
  mensagemCadastro.textContent = 'Cadastrando usuário...';

  try {
    const {
      data: { session },
      error: erroSessao
    } = await supabase.auth.getSession();

    if (erroSessao || !session?.access_token) {
      throw new Error('Sessão expirada. Entre novamente no sistema.');
    }

    const resposta = await fetch('/api/criar-usuario', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        nome,
        email,
        senha,
        papel
      })
    });

    let resultado;

    try {
      resultado = await resposta.json();
    } catch {
      throw new Error(
        `O servidor retornou uma resposta inválida (HTTP ${resposta.status}).`
      );
    }

    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        resultado.error ||
        'Não foi possível cadastrar o usuário.'
      );
    }

    formularioCadastro.reset();

    mensagemCadastro.textContent =
      `Usuário "${nome}" cadastrado com sucesso!`;

    await carregarUsuarios();

  } catch (error) {
    mensagemCadastro.textContent =
      error.message || 'Erro ao cadastrar usuário.';
    console.error(error);
  } finally {
    cadastroEmAndamento = false;
    botaoCadastrar.disabled = false;
    botaoCadastrar.textContent = 'Cadastrar usuário';
  }
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

if (formularioCadastro) {
  formularioCadastro.addEventListener('submit', cadastrarUsuario);
}

iniciar();
