import { supabase } from '../supabaseClient.js';
import { protegerRota, sair } from '../auth.js';
import { listarPerfis } from '../services/perfis.js';

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

// Cria uma linha da tabela sem inserir HTML externo.
function adicionarLinha(tabela, valores) {
  const linha = document.createElement('tr');

  for (const valor of valores) {
    const celula = document.createElement('td');
    celula.textContent = String(valor ?? '-');
    linha.appendChild(celula);
  }

  tabela.appendChild(linha);
}

// Consulta as vagas cadastradas.
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
      adicionarLinha(tabelaVagas, [
        vaga.numero,
        vaga.setor ?? '-',
        vaga.tipo ?? '-',
        vaga.ocupada ? 'Ocupada' : 'Livre'
      ]);
    }

    mensagemVagas.textContent =
      `${vagas.length} vaga(s) carregada(s).`;

  } catch (error) {
    mensagemVagas.textContent =
      'Não foi possível consultar as vagas.';

    console.error('Erro ao carregar vagas:', error);
  }
}

// Consulta os usuários cadastrados.
async function carregarUsuarios() {
  mensagemUsuarios.textContent = 'Carregando usuários...';
  tabelaUsuarios.replaceChildren();

  try {
    const usuarios = await listarPerfis();

    for (const usuario of usuarios) {
      adicionarLinha(tabelaUsuarios, [
        usuario.nome,
        usuario.papel === 'admin'
          ? 'Administrador'
          : 'Atendente',
        usuario.ativo ? 'Ativo' : 'Inativo'
      ]);
    }

    mensagemUsuarios.textContent =
      `${usuarios.length} usuário(s) carregado(s).`;

  } catch (error) {
    mensagemUsuarios.textContent =
      'Não foi possível consultar os usuários.';

    console.error('Erro ao carregar usuários:', error);
  }
}

// Inicializa a página após validar o acesso.
async function iniciar() {
  try {
    const perfil = await protegerRota();

    if (!perfil) return;

    if (perfil.papel !== 'admin') {
      window.location.replace('painel.html');
      return;
    }

    identificacao.textContent =
      `${perfil.nome} · ${perfil.papel}`;

    conteudo.hidden = false;

    await Promise.all([
      carregarVagas(),
      carregarUsuarios()
    ]);

  } catch (error) {
    console.error('Erro ao iniciar administração:', error);
    window.location.replace('painel.html');
  }
}

// Botões
botaoSair.addEventListener('click', async () => {
  try {
    await sair();
  } catch (error) {
    alert(error.message);
  }
});

botaoAtualizarVagas.addEventListener(
  'click',
  carregarVagas
);

botaoAtualizarUsuarios.addEventListener(
  'click',
  carregarUsuarios
);

iniciar();
