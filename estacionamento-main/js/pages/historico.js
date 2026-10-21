
import { protegerRota, sair } from '../auth.js';
import { listarHistorico } from '../services/movimentacoes.js';

const conteudo = document.querySelector('#conteudo-historico');
const identificacao = document.querySelector('#identificacao-perfil');
const mensagem = document.querySelector('#mensagem-historico');
const tabela = document.querySelector('#tabela-historico');
const total = document.querySelector('#total-movimentacoes');
const filtro = document.querySelector('#filtro-placa');
const botaoAtualizar = document.querySelector('#botao-atualizar');
const botaoSair = document.querySelector('#botao-sair');

let movimentacoes = [];

function formatarData(valor) {
  if (!valor) return '-';

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '-';
  }

  return data.toLocaleString('pt-BR');
}

function formatarDuracao(entrada, saida) {
  if (!entrada) return '-';

  const inicio = new Date(entrada).getTime();
  const fim = saida
    ? new Date(saida).getTime()
    : Date.now();

  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) {
    return '-';
  }

  const minutos = Math.max(
    0,
    Math.floor((fim - inicio) / 60000)
  );

  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const restantes = minutos % 60;

  if (dias > 0) {
    return `${dias}d ${horas}h ${restantes}min`;
  }

  if (horas > 0) {
    return `${horas}h ${restantes}min`;
  }

  return `${restantes}min`;
}

function adicionarCelula(linha, valor) {
  const celula = document.createElement('td');
  celula.textContent = String(valor ?? '-');
  linha.appendChild(celula);
}

function exibirHistorico() {
  const placaPesquisada = filtro.value
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '');

  const registros = movimentacoes.filter(item => {
    const placa = item.veiculos?.placa ?? '';

    return placa
      .toUpperCase()
      .replace(/[\s-]/g, '')
      .includes(placaPesquisada);
  });

  tabela.replaceChildren();
  total.textContent = registros.length;

  if (registros.length === 0) {
    const linha = document.createElement('tr');
    const celula = document.createElement('td');

    celula.colSpan = 7;
    celula.textContent = 'Nenhuma movimentação encontrada.';

    linha.appendChild(celula);
    tabela.appendChild(linha);

    return;
  }

  for (const item of registros) {
    const linha = document.createElement('tr');

    adicionarCelula(linha, item.veiculos?.placa);
    adicionarCelula(linha, item.vagas?.numero);
    adicionarCelula(linha, item.vagas?.setor);
    adicionarCelula(linha, formatarData(item.entrada_em));
    adicionarCelula(linha, formatarData(item.saida_em));

    adicionarCelula(
      linha,
      formatarDuracao(item.entrada_em, item.saida_em)
    );

    adicionarCelula(
      linha,
      item.saida_em ? 'Finalizada' : 'No pátio'
    );

    tabela.appendChild(linha);
  }
}

async function atualizarHistorico() {
  botaoAtualizar.disabled = true;
  mensagem.textContent = 'Consultando movimentações...';

  try {
    movimentacoes = await listarHistorico();

    exibirHistorico();

    mensagem.textContent =
      `${movimentacoes.length} movimentação(ões) carregada(s).`;
  } catch (error) {
    mensagem.textContent =
      `Erro ao consultar histórico: ${error.message}`;
  } finally {
    botaoAtualizar.disabled = false;
  }
}

filtro.addEventListener('input', exibirHistorico);

botaoAtualizar.addEventListener('click', atualizarHistorico);

botaoSair.addEventListener('click', async () => {
  botaoSair.disabled = true;

  try {
    await sair();
  } catch (error) {
    mensagem.textContent = error.message;
    botaoSair.disabled = false;
  }
});

try {
  const perfil = await protegerRota();

  if (perfil) {
    identificacao.textContent =
      `${perfil.nome} · ${perfil.papel}`;

    conteudo.hidden = false;

    await atualizarHistorico();
  }
} catch (error) {
  conteudo.hidden = false;

  mensagem.textContent =
    `Erro ao carregar histórico: ${error.message}`;
}
