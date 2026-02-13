const mysql = require('mysql2/promise');
require('dotenv').config();

// Criamos um 'pool' de conexões para maior eficiência
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Teste de conexão imediato ao iniciar
db.getConnection()
  .then(conn => {
    console.log('⚓ Conexão com o banco de dados do Doubloon System estabelecida!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
  });

module.exports = db;