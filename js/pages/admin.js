import { supabase } from '../supabaseClient.js';
import { protegerRota, sair } from '../auth.js';

const conteudo = document.getElementById('conteudo-admin');
const identificacao = document.getElementById('identificacao-perfil');
const botaoSair = document.getElementById('botao-sair');
const tabelaVagas = document.getElementById('tabela-vagas');
const mensagemVagas = document.getElementById('mensagem-vagas');

async function carregarVagas() {
  mensagemVagas.textContent = 'Carregando vagas...';
  tabelaVagas.replaceChildren();

  const { data, error } = await supabase
    .from('vagas_status')
    .select('*')
    .order('numero');

  if (error) {
    mensagemVagas.textContent =
      'Não foi possível consultar as vagas.';
    console.error(error);
    return;
  }

  const vagas = data ?? [];

  for (const vaga of vagas) {
    const linha = document.createElement('tr');

    const campos = [
      vaga.numero,
      vaga.setor ?? '-',
      vaga.tipo ?? '-',
      vaga.ocupada ? 'Ocupada' : 'Livre'
    ];

    for (const valor of campos) {
      const celula = document.createElement('td');
      celula.textContent = valor;
      linha.appendChild(celula);
    }

    tabelaVagas.appendChild(linha);
  }

  mensagemVagas.textContent =
    `${vagas.length} vaga(s) carregada(s).`;
}

async function iniciar() {
  const perfil = await protegerRota();

  if (!perfil) return;

  if (perfil.papel !== 'admin') {
    window.location.replace('painel.html');
    return;
  }

  identificacao.textContent =
    `${perfil.nome} · ${perfil.papel}`;

  conteudo.hidden = false;

  await carregarVagas();
}

botaoSair.addEventListener('click', async () => {
  try {
    await sair();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('botao-atualizar-vagas')
  .addEventListener('click', carregarVagas);

iniciar();
