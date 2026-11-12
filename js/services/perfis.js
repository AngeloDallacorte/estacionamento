import { supabase } from '../supabaseClient.js';

// Busca o perfil do usuário autenticado.
export async function buscarPerfilPorId(usuarioId) {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, papel, ativo')
    .eq('id', usuarioId)
    .maybeSingle();

  if (error) {
    throw new Error(
      'Não foi possível validar o perfil de acesso.'
    );
  }

  return data;
}

// Lista os usuários cadastrados.
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

// Ativa ou desativa um usuário.
// A permissão de alteração é validada pelo Supabase (RLS).
export async function alterarSituacaoUsuario(usuarioId, ativo) {
  const { data: autenticacao, error: erroAutenticacao } =
    await supabase.auth.getUser();

  if (erroAutenticacao || !autenticacao.user) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  // Impede que o administrador altere a própria situação.
  if (autenticacao.user.id === usuarioId) {
    throw new Error(
      'Você não pode alterar a situação da sua própria conta.'
    );
  }

  const { data, error } = await supabase
    .from('perfis')
    .update({ ativo: Boolean(ativo) })
    .eq('id', usuarioId)
    .select('id, nome, papel, ativo')
    .single();

  if (error) {
    throw new Error(
      'Não foi possível alterar a situação do usuário.'
    );
  }

  return data;
}
