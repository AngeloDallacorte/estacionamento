
const fs = require('node:fs');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('ERRO: Variáveis do Supabase não configuradas.');
  process.exit(1);
}

if (!url.startsWith('https://')) {
  throw new Error('SUPABASE_URL deve utilizar HTTPS.');
}

if (!key.startsWith('sb_publishable_')) {
  throw new Error('Utilize somente a chave publicável do Supabase.');
}

const config = `
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = '';
export const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(key)};
`;

fs.writeFileSync('js/config.js', config, 'utf8');

console.log('Configuração pública do Supabase gerada com sucesso.');
