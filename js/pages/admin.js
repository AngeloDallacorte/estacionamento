import { protegerRota, sair } from '../auth.js';

async function iniciarAdministracao() {
  const perfil = await protegerRota();

  if (!perfil) return;

  if (perfil.papel !== 'admin') {
    window.location.replace('painel.html');
    return;
  }

  const identificacao = document.getElementById('identificacao-perfil');

  if (identificacao) {
    identificacao.textContent = `${perfil.nome} · ${perfil.papel}`;
  }

  const conteudo = document.getElementById('conteudo-admin');

  if (conteudo) {
    conteudo.hidden = false;
  }

  const botaoSair = document.getElementById('botao-sair');

  if (botaoSair) {
    botaoSair.addEventListener('click', async () => {
      try {
        await sair();
      } catch (erro) {
        alert(erro.message);
      }
    });
  }
}

iniciarAdministracao();
