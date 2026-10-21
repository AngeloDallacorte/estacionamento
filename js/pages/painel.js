
import { protegerRota, sair } from '../auth.js';
import {
  registrarEntrada,
  registrarSaida,
  listarNoPatio,
  listarVagas,
} from '../services/movimentacoes.js';

const conteudo = document.querySelector('#conteudo-painel');
const identificacao = document.querySelector('#identificacao-perfil');
const mensagem = document.querySelector('#mensagem-painel');

const botaoSair = document.querySelector('#botao-sair');
const botaoAtualizar = document.querySelector('#botao-atualizar');

const formEntrada = document.querySelector('#form-entrada');
const formSaida = document.querySelector('#form-saida');

const campoVaga = document.querySelector('#entrada-vaga');
const tabelaPatio = document.querySelector('#tabela-patio');

function informar(texto) {
  mensagem.textContent = texto;
}

function formatarData(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR');
}

function formatarDuracao(valor) {
  if (!valor) return '-';

  const minutos = Math.max(
    0,
    Math.floor((Date.now() - new Date(valor).getTime()) / 60000)
  );

  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;

  return horas > 0
    ? `${horas}h ${restante}min`
    : `${restante}min`;
}

function criarCelula(linha, texto) {
  const celula = document.createElement('td');
  celula.textContent = texto;
  linha.appendChild(celula);
  return celula;
}

function normalizarPlaca(placa) {
  return placa.trim().toUpperCase().replace(/[\s-]/g, '');
}

async function atualizarPainel() {
  const [vagas, veiculos] = await Promise.all([
    listarVagas(),
    listarNoPatio(),
  ]);

  const vagasAtivas = vagas.filter(vaga => vaga.ativa);
  const livres = vagasAtivas.filter(vaga => !vaga.ocupada);
  const ocupadas = vagasAtivas.filter(vaga => vaga.ocupada);

  document.querySelector('#total-vagas').textContent =
    vagasAtivas.length;

  document.querySelector('#vagas-livres').textContent =
    livres.length;

  document.querySelector('#vagas-ocupadas').textContent =
    ocupadas.length;

  document.querySelector('#taxa-ocupacao').textContent =
    vagasAtivas.length
      ? `${Math.round(ocupadas.length / vagasAtivas.length * 100)}%`
      : '0%';

  const vagaSelecionada = campoVaga.value;
  campoVaga.replaceChildren();

  const opcaoInicial = document.createElement('option');
  opcaoInicial.value = '';
  opcaoInicial.textContent = 'Selecione uma vaga livre';
  campoVaga.appendChild(opcaoInicial);

  for (const vaga of livres) {
    const opcao = document.createElement('option');
    opcao.value = vaga.numero;
    opcao.textContent = `${vaga.numero} - ${vaga.setor ?? 'Sem setor'}`;
    campoVaga.appendChild(opcao);
  }

  if (livres.some(vaga => vaga.numero === vagaSelecionada)) {
    campoVaga.value = vagaSelecionada;
  }

  tabelaPatio.replaceChildren();

  if (veiculos.length === 0) {
    const linha = document.createElement('tr');
    const celula = criarCelula(
      linha,
      'Nenhum veículo estacionado no momento.'
    );
    celula.colSpan = 6;
    tabelaPatio.appendChild(linha);
    return;
  }

  for (const veiculo of veiculos) {
    const linha = document.createElement('tr');

    criarCelula(linha, veiculo.placa_atual ?? '-');
    criarCelula(linha, veiculo.numero ?? '-');
    criarCelula(linha, veiculo.setor ?? '-');
    criarCelula(linha, formatarData(veiculo.entrada_em));
    criarCelula(linha, formatarDuracao(veiculo.entrada_em));

    const celulaAcao = document.createElement('td');
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.textContent = 'Registrar saída';
    botao.disabled = !veiculo.placa_atual;

    botao.addEventListener('click', () => {
      document.querySelector('#saida-placa').value =
        veiculo.placa_atual;
      document.querySelector('#saida-placa').focus();
      informar('Placa preenchida. Confirme a saída no formulário.');
    });

    celulaAcao.appendChild(botao);
    linha.appendChild(celulaAcao);
    tabelaPatio.appendChild(linha);
  }
}

formEntrada.addEventListener('submit', async evento => {
  evento.preventDefault();

  const botao = document.querySelector('#botao-entrada');
  botao.disabled = true;
  informar('Registrando entrada...');

  try {
    const resultado = await registrarEntrada({
      placa: normalizarPlaca(
        document.querySelector('#entrada-placa').value
      ),
      vagaNumero: campoVaga.value,
      categoria:
        document.querySelector('#entrada-categoria').value || null,
      modelo:
        document.querySelector('#entrada-modelo').value || null,
      cor:
        document.querySelector('#entrada-cor').value || null,
    });

    formEntrada.reset();

    try {
      await atualizarPainel();
      informar(
        `Entrada registrada: ${resultado.placa}, vaga ${resultado.vaga_numero}.`
      );
    } catch (erroAtualizacao) {
      informar(
        'Entrada registrada, mas não foi possível atualizar o painel: ' +
        erroAtualizacao.message
      );
    }
  } catch (erro) {
    informar(`Erro na entrada: ${erro.message}`);
  } finally {
    botao.disabled = false;
  }
});

formSaida.addEventListener('submit', async evento => {
  evento.preventDefault();

  const botao = document.querySelector('#botao-saida');
  botao.disabled = true;
  informar('Registrando saída...');

  try {
    const resultado = await registrarSaida(
      normalizarPlaca(document.querySelector('#saida-placa').value)
    );

    formSaida.reset();

    try {
      await atualizarPainel();
      informar(`Saída registrada: ${resultado.placa}.`);
    } catch (erroAtualizacao) {
      informar(
        'Saída registrada, mas não foi possível atualizar o painel: ' +
        erroAtualizacao.message
      );
    }
  } catch (erro) {
    informar(`Erro na saída: ${erro.message}`);
  } finally {
    botao.disabled = false;
  }
});

botaoAtualizar.addEventListener('click', async () => {
  botaoAtualizar.disabled = true;
  informar('Atualizando informações...');

  try {
    await atualizarPainel();
    informar('Informações atualizadas.');
  } catch (erro) {
    informar(`Erro ao atualizar: ${erro.message}`);
  } finally {
    botaoAtualizar.disabled = false;
  }
});

botaoSair.addEventListener('click', async () => {
  botaoSair.disabled = true;

  try {
    await sair();
  } catch (erro) {
    informar(erro.message);
    botaoSair.disabled = false;
  }
});

try {
  const perfil = await protegerRota();

  if (perfil) {
    identificacao.textContent = `${perfil.nome} · ${perfil.papel}`;

    if (perfil.papel === 'admin') {
      document.querySelectorAll('[data-admin-only]').forEach(link => {
        link.hidden = false;
      });
    }

    conteudo.hidden = false;
    await atualizarPainel();
  }
} catch (erro) {
  conteudo.hidden = false;
  informar(`Erro ao carregar o painel: ${erro.message}`);
}
