import { protegerRota, sair } from '../auth.js';

const conteudo = document.querySelector('#conteudo-painel');
const identificacaoPerfil = document.querySelector('#identificacao-perfil');
const botaoSair = document.querySelector('#botao-sair');
const mensagem = document.querySelector('#mensagem-painel');

const perfil = await protegerRota();

if (perfil) {
	identificacaoPerfil.textContent = `${perfil.nome} · ${perfil.papel}`;
	conteudo.hidden = false;
}

botaoSair.addEventListener('click', async () => {
	botaoSair.disabled = true;
	mensagem.textContent = '';

	try {
		await sair();
	} catch (error) {
		mensagem.textContent = error.message;
		botaoSair.disabled = false;
	}
});