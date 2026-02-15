const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importa o arquivo de rotas que criamos no Passo 1
const apiRoutes = require('./routes/api');

const app = express();

// Libera a alfândega (CORS) para o React conseguir ler os dados
app.use(cors());
app.use(express.json());

// 🚦 SINAL VERDE: Tudo que começar com /api vai ser jogado para o apiRoutes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Localização: Vacaria, RS`);
});