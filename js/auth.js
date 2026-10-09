import { supabase } from './supabaseClient.js';
import { buscarPerfilPorId } from './services/perfis.js';

export async function entrar(email, senha) {
	const { error } = await supabase.auth.signInWithPassword({
		email,
		password: senha,
	});

	if (error) {
		if (error.name === 'AuthRetryableFetchError') {
			throw new Error('Não foi possível conectar ao serviço. Tente novamente.');
		}

		throw new Error('E-mail ou senha inválidos. Confira os dados e tente novamente.');
	}
}

export async function protegerRota() {
	const { data, error } = await supabase.auth.getSession();

	if (error || !data.session) {
		window.location.replace('../index.html');
		return null;
	}

	let perfil;

	try {
		perfil = await buscarPerfilPorId(data.session.user.id);
	} catch {
		await supabase.auth.signOut();
		window.location.replace('../index.html?motivo=perfil');
		return null;
	}

	if (!perfil || !perfil.ativo) {
		await supabase.auth.signOut();
		window.location.replace('../index.html?motivo=perfil');
		return null;
	}

	document.body.dataset.papel = perfil.papel;
	document.querySelectorAll('[data-admin-only]').forEach((item) => {
		item.hidden = perfil.papel !== 'admin';
	});

	return perfil;
}

export async function sair() {
	const { error } = await supabase.auth.signOut();

	if (error) {
		throw new Error('Não foi possível encerrar a sessão. Tente novamente.');
	}

	window.location.replace('../index.html');
}