
import { entrar, solicitarRecuperacaoSenha } from '../auth.js';

const formulario = document.querySelector('#formulario-login');
const campoEmail = document.querySelector('#email');
const campoSenha = document.querySelector('#senha');
const botao = document.querySelector('#botao-login');
const mensagem = document.querySelector('#mensagem-login');

const motivo = new URLSearchParams(window.location.search).get('motivo');

if (motivo === 'perfil') {
  mensagem.textContent =
    'Acesso não autorizado. Verifique seu perfil com um administrador.';
}

const botaoRecuperar = document.createElement('button');
botaoRecuperar.type = 'button';
botaoRecuperar.textContent = 'Esqueci minha senha';
formulario.insertAdjacentElement('afterend', botaoRecuperar);

botaoRecuperar.addEventListener('click', async () => {
  const email = campoEmail.value.trim();

  if (!email || !campoEmail.checkValidity()) {
    mensagem.textContent = 'Informe um e-mail válido para recuperar a senha.';
    campoEmail.focus();
    return;
  }

  botaoRecuperar.disabled = true;
  mensagem.textContent = 'Solicitando recuperação de senha...';

  try {
    await solicitarRecuperacaoSenha(email);
    mensagem.textContent =
      'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.';
  } catch (error) {
    mensagem.textContent = `Erro ao solicitar recuperação: ${error.message}`;
  } finally {
    botaoRecuperar.disabled = false;
  }
});

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensagem.textContent = '';

  if (!formulario.reportValidity()) {
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Entrando...';
  formulario.setAttribute('aria-busy', 'true');

  try {
    await entrar(campoEmail.value.trim(), campoSenha.value);
    window.location.assign('./pages/painel.html');
  } catch (error) {
    mensagem.textContent = error.message;
    campoSenha.focus();
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
    formulario.removeAttribute('aria-busy');
  }
});
