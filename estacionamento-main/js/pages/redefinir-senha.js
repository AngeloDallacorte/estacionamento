
import { supabase } from '../supabaseClient.js';

const formulario = document.querySelector('#formulario-redefinicao');
const novaSenha = document.querySelector('#nova-senha');
const confirmarSenha = document.querySelector('#confirmar-senha');
const botao = document.querySelector('#botao-redefinir');
const mensagem = document.querySelector('#mensagem-redefinicao');

let recuperacaoAutorizada = false;

async function verificarRecuperacao() {
  try {
    const parametros = new URLSearchParams(window.location.search);
    const codigo = parametros.get('code');
    const tokenHash = parametros.get('token_hash');
    const tipo = parametros.get('type');

    if (codigo) {
      const { error } = await supabase.auth.exchangeCodeForSession(codigo);
      if (error) throw error;
    } else if (tokenHash && tipo === 'recovery') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });
      if (error) throw error;
    } else if (window.location.hash.includes('access_token=')) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        throw new Error('Não foi possível validar o link.');
      }
    } else {
      throw new Error('Abra esta página pelo link de recuperação recebido por e-mail.');
    }

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error('A sessão de recuperação não foi confirmada.');
    }

    recuperacaoAutorizada = true;
    botao.disabled = false;
    mensagem.textContent = 'Link validado. Informe a nova senha.';
    window.history.replaceState({}, '', window.location.pathname);
  } catch (error) {
    recuperacaoAutorizada = false;
    botao.disabled = true;
    mensagem.textContent =
      error.message || 'Link inválido ou expirado. Solicite outro e-mail.';
  }
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (!recuperacaoAutorizada) {
    mensagem.textContent = 'É necessário validar o link de recuperação.';
    return;
  }

  if (novaSenha.value !== confirmarSenha.value) {
    mensagem.textContent = 'As senhas não coincidem.';
    return;
  }

  botao.disabled = true;
  mensagem.textContent = 'Salvando nova senha...';

  try {
    const { error } = await supabase.auth.updateUser({
      password: novaSenha.value,
    });

    if (error) throw error;

    mensagem.textContent =
      'Senha atualizada com sucesso! Volte ao login para entrar.';

    formulario.reset();
    recuperacaoAutorizada = false;

    await supabase.auth.signOut();
  } catch (error) {
    mensagem.textContent = `Erro ao redefinir senha: ${error.message}`;
    botao.disabled = false;
  }
});

await verificarRecuperacao();
