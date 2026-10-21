import { supabase } from '../supabaseClient.js';

export async function buscarPerfilPorId(usuarioId) {
	const { data, error } = await supabase
		.from('perfis')
		.select('id, nome, papel, ativo')
		.eq('id', usuarioId)
		.maybeSingle();

	if (error) {
		throw new Error('Não foi possível validar o perfil de acesso.');
	}

	return data;
}