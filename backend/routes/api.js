const express = require('express');
const router = express.Router();

// Importação dos Controladores que criamos anteriormente
const inventoryController = require('../controllers/inventoryController');
const movementController = require('../controllers/movementController');
const workOrderController = require('../controllers/workOrderController');
const reportController = require('../controllers/reportController');

// =========================================================
// MIDDLEWARES DE SEGURANÇA (Autenticação e Permissão)
// =========================================================

// Simulação de middleware que verifica se o usuário está logado
const requireAuth = (req, res, next) => {
  // Lógica para verificar o token JWT do usuário...
  // req.user = { id: 1, name: 'Lucas', role: 'admin' };
  next(); 
};

// Middleware V.I.P: Verifica se é Diretoria
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Operação restrita à Diretoria.' });
  }
};

// Aplica autenticação em TODAS as rotas abaixo
router.use(requireAuth); 

// =========================================================
// 1. ROTAS DO INVENTÁRIO (Restritas à Diretoria)
// =========================================================
// O frontend chamará POST /api/inventory para cadastrar a placa ou o cabo
router.post('/inventory', requireAdmin, inventoryController.createItem);

// O frontend chamará PUT /api/inventory/5 para mudar o nome ou alerta
router.put('/inventory/:id', requireAdmin, inventoryController.updateItem);

// (A rota de GET /inventory para listar os itens ficaria aqui, liberada para todos)


// =========================================================
// 2. ROTAS DE MOVIMENTAÇÃO (Entrada de Nota Fiscal / Lote)
// =========================================================
// Liberado para a equipe operacional dar entrada na carga
router.post('/movements/batch', movementController.processBatchEntry);


// =========================================================
// 3. ROTAS DE KITS E PROJETOS (A Máquina de Estados WMS)
// =========================================================
// Criar o "esqueleto" do kit (Status: Pendente)
router.post('/work-orders', workOrderController.createWorkOrder);

// O botão mágico do card: Muda para 'separado' ou 'entregue'
router.put('/work-orders/:id/status', workOrderController.changeStatus);


// =========================================================
// 4. ROTAS DE RELATÓRIOS E LOGS (O Motor de Busca)
// =========================================================
// Rota da tela principal de logs (com filtros dinâmicos na URL: ?user=João&type=ENTRADA)
router.get('/reports/logs', reportController.getLogs);

// Rota do botão "Mais Relatórios" -> Histórico do Cliente
router.get('/reports/clients/:clientId/history', reportController.getClientHistory);

// Rota do botão "Mais Relatórios" -> Campeões de Saída (Volume)
router.get('/reports/items/volume', reportController.getItemVolume);

module.exports = router;