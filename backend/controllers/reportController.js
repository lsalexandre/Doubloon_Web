const db = require('../config/db');

const reportController = {
  
  // 1. A Busca Dinâmica Principal (Filtros do Relatório)
  getLogs: async (req, res) => {
    // Recebe os filtros do Frontend (se estiverem vazios, serão undefined)
    const { startDate, endDate, user, reference, item_name, type } = req.query;

    // O truque 'WHERE 1=1' permite adicionar os 'AND' dinamicamente
    let query = `
      SELECT id, user, action, type, reference, created_at 
      FROM logs 
      WHERE 1=1
    `;
    const params = [];

    // Filtro 1: Período (Data Início e Fim)
    if (startDate && endDate) {
      query += ` AND DATE(created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    // Filtro 2: Usuário (Ex: "Lucas")
    if (user) {
      query += ` AND user = ?`;
      params.push(user);
    }

    // Filtro 3: Motivo / Origem / Cliente (Ex: "NF 123" ou "Projeto Solar")
    if (reference) {
      query += ` AND reference LIKE ?`;
      params.push(`%${reference}%`); // Busca parcial (LIKE)
    }

    // Filtro 4: Tipo de Operação (Ex: 'ENTRADA', 'STATUS', 'CRIACAO')
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    // Filtro 5: Item Específico (Procura o nome do item dentro da string de ação)
    if (item_name) {
      query += ` AND action LIKE ?`;
      params.push(`%${item_name}%`);
    }

    // Ordena do mais recente pro mais antigo
    query += ` ORDER BY created_at DESC`;

    try {
      const [results] = await db.query(query, params);
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao gerar relatório avançado.' });
    }
  },

  // =========================================================
  // ABA "MAIS RELATÓRIOS" (Inteligência de Negócio)
  // =========================================================

  // 2. Histórico de Movimentação de um Cliente Específico
  getClientHistory: async (req, res) => {
    const { clientId } = req.params;

    const query = `
      SELECT wo.id, wo.name AS project_name, wo.type, wo.status, wo.created_at, wo.created_by
      FROM work_orders wo
      WHERE wo.client_id = ?
      ORDER BY wo.created_at DESC
    `;

    try {
      const [history] = await db.query(query, [clientId]);
      res.status(200).json(history);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar histórico do cliente.' });
    }
  },

  // 3. Quantidade Total de Saída por Item (Os "Campeões de Venda")
  getItemVolume: async (req, res) => {
    // Essa query cruza os Kits "Entregues" com os Itens para saber o volume real que saiu
    const query = `
      SELECT i.sku, i.name, SUM(woi.quantity) as total_out
      FROM work_order_items woi
      JOIN work_orders wo ON woi.work_order_id = wo.id
      JOIN inventory_items i ON woi.item_id = i.id
      WHERE wo.status = 'entregue'
      GROUP BY i.id
      ORDER BY total_out DESC
    `;

    try {
      const [volumes] = await db.query(query);
      res.status(200).json(volumes);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao calcular volume de itens.' });
    }
  }
};

module.exports = reportController;