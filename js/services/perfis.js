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

// Lista os usuários cadastrados no sistema.
// A autorização deve ser aplicada também no Supabase (RLS).
export async function listarPerfis() {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, papel, ativo')
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(
      'Não foi possível carregar os usuários cadastrados.'
    );
  }

  return data ?? [];
}
