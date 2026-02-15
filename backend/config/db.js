const { Pool } = require('pg');
require('dotenv').config();

// ⚓ Conexão em Nuvem (Preparada para o Neon.tech e Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Exigência para conexões seguras na nuvem
  }
});

pool.connect()
  .then(client => {
    console.log('⚓ Doubloon System: Conectado ao banco de dados na NUVEM com sucesso!');
    client.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao banco na nuvem. Verifique a DATABASE_URL.', err.message);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
};