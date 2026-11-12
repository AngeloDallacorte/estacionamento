
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      erro: 'Método não permitido.'
    });
  }

  const url = process.env.SUPABASE_URL;
  const chavePublica = process.env.SUPABASE_PUBLISHABLE_KEY;
  const chaveSecreta = process.env.SUPABASE_SECRET_KEY;

  if (!url || !chavePublica || !chaveSecreta) {
    return res.status(500).json({
      erro: 'Configuração do servidor incompleta.'
    });
  }

  try {
    const autorizacao = req.headers.authorization || '';
    const token = autorizacao.startsWith('Bearer ')
      ? autorizacao.slice(7).trim()
      : '';

    if (!token) {
      return res.status(401).json({
        erro: 'Autenticação necessária.'
      });
    }

    const supabaseUsuario = createClient(url, chavePublica, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: autenticacao, error: erroAutenticacao } =
      await supabaseUsuario.auth.getUser(token);

    if (erroAutenticacao || !autenticacao.user) {
      return res.status(401).json({
        erro: 'Sessão inválida.'
      });
    }

    const supabaseAdmin = createClient(url, chaveSecreta, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: administrador, error: erroAdministrador } =
      await supabaseAdmin
        .from('perfis')
        .select('papel, ativo')
        .eq('id', autenticacao.user.id)
        .maybeSingle();

    if (
      erroAdministrador ||
      !administrador ||
      !administrador.ativo ||
      administrador.papel !== 'admin'
    ) {
      return res.status(403).json({
        erro: 'Acesso permitido somente a administradores.'
      });
    }

    const corpo = req.body || {};

    const nome = typeof corpo.nome === 'string'
      ? corpo.nome.trim()
      : '';

    const email = typeof corpo.email === 'string'
      ? corpo.email.trim().toLowerCase()
      : '';

    const senha = corpo.senha;
    const papel = corpo.papel;

    if (
      nome.length < 3 ||
      nome.length > 120 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof senha !== 'string' ||
      senha.length < 8 ||
      senha.length > 128 ||
      !['admin', 'atendente'].includes(papel)
    ) {
      return res.status(400).json({
        erro: 'Dados de cadastro inválidos.'
      });
    }

    const { data: criacao, error: erroCriacao } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true
      });

    if (erroCriacao || !criacao.user) {
      return res.status(400).json({
        erro: 'Não foi possível criar a conta. Verifique o e-mail informado.'
      });
    }

    const novoUsuarioId = criacao.user.id;

    const { error: erroPerfil } = await supabaseAdmin
      .from('perfis')
      .insert({
        id: novoUsuarioId,
        nome,
        papel,
        ativo: true
      });

    if (erroPerfil) {
      const { error: erroExclusao } =
        await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);

      console.error('Erro ao criar perfil:', erroPerfil);

      if (erroExclusao) {
        console.error('Erro ao reverter cadastro:', erroExclusao);

        return res.status(500).json({
          erro: 'Cadastro incompleto. Verifique os registros no Supabase.'
        });
      }

      return res.status(500).json({
        erro: 'Não foi possível concluir o cadastro.'
      });
    }

    return res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso.',
      usuario: {
        id: novoUsuarioId,
        nome,
        email,
        papel,
        ativo: true
      }
    });

  } catch (error) {
    console.error('Erro no cadastro:', error);

    return res.status(500).json({
      erro: 'Erro interno ao cadastrar usuário.'
    });
  }
};
