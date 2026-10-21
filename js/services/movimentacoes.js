
import { supabase } from '../supabaseClient.js';

export async function registrarEntrada({
  placa,
  vagaNumero,
  categoria = null,
  modelo = null,
  cor = null,
}) {
  const { data, error } = await supabase.rpc('registrar_entrada', {
    p_placa: placa,
    p_vaga_numero: vagaNumero,
    p_categoria: categoria,
    p_modelo: modelo,
    p_cor: cor,
  });

  if (error) {
    throw new Error(error.message || 'Erro ao registrar entrada.');
  }

  return data;
}

export async function registrarSaida(placa) {
  const { data, error } = await supabase.rpc('registrar_saida', {
    p_placa: placa,
  });

  if (error) {
    throw new Error(error.message || 'Erro ao registrar saída.');
  }

  return data;
}

export async function listarNoPatio() {
  const { data, error } = await supabase
    .from('vagas_status')
    .select('*')
    .eq('ocupada', true)
    .order('entrada_em', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Erro ao consultar veículos no pátio.');
  }

  return data ?? [];
}

export async function listarVagas() {
  const { data, error } = await supabase
    .from('vagas_status')
    .select('*')
    .order('numero', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Erro ao consultar vagas.');
  }

  return data ?? [];
}

export async function listarHistorico() {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(`
      id,
      entrada_em,
      saida_em,
      observacao,
      vagas ( numero, setor ),
      veiculos ( placa, modelo, cor, categoria )
    `)
    .order('entrada_em', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Erro ao consultar o histórico.');
  }

  return data ?? [];
}


  return validarResultado(data, error);
}

export async function registrarSaida(placa) {
  const { data, error } = await supabase.rpc('registrar_saida', {
    p_placa: placa,
  });

  return validarResultado(data, error);
}

export async function listarNoPatio() {
  const { data, error } = await supabase
    .from('vagas_status')
    .select('*')
    .eq('ocupada', true)
    .order('entrada_em', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Erro ao consultar veículos no pátio.');
  }

  return data ?? [];
}

export async function listarVagas() {
  const { data, error } = await supabase
    .from('vagas_status')
    .select('*')
    .order('numero', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Erro ao consultar vagas.');
  }

  return data ?? [];
}

export async function listarHistorico() {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(`
      id,
      entrada_em,
      saida_em,
      observacao,
      vagas ( numero, setor ),
      veiculos ( placa, modelo, cor, categoria )
    `)
    .order('entrada_em', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Erro ao consultar o histórico.');
  }

  return data ?? [];
}
