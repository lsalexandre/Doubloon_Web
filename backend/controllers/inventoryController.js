const db = require('../config/db'); // Sua conexão com o banco

const inventoryController = {
  // Criar novo tipo de item (Apenas Admin)
  createItem: async (req, res) => {
    try {
      const { name, category, alert_minimum } = req.body;
      let { sku } = req.body;

      // Se não vier SKU, gera um aleatório de 8 dígitos
      if (!sku) {
        let isUnique = false;
        while (!isUnique) {
          sku = Math.floor(10000000 + Math.random() * 90000000).toString();
          const [existing] = await db.query('SELECT id FROM inventory_items WHERE sku = ?', [sku]);
          if (existing.length === 0) isUnique = true;
        }
      }

      // Estoque Físico e Virtual NASCEM ZERADOS (Regra de ouro)
      const query = `
        INSERT INTO inventory_items (sku, name, category, physical_stock, virtual_stock, alert_minimum) 
        VALUES (?, ?, ?, 0, 0, ?)
      `;
      await db.query(query, [sku, name, category, alert_minimum || null]);

      // Registrar no Log
      await db.query(`INSERT INTO logs (user, action, type) VALUES (?, ?, 'CADASTRO')`, 
        [req.user.name, `Diretoria: Novo Cadastro: ${name} (SKU: ${sku})`]);

      res.status(201).json({ message: 'Item cadastrado com sucesso!', sku });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao cadastrar item.' });
    }
  },

  // Editar Item (Apenas nome, categoria e alerta. SEM ESTOQUE)
  updateItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, alert_minimum } = req.body;

      await db.query(`
        UPDATE inventory_items 
        SET name = ?, category = ?, alert_minimum = ? 
        WHERE id = ?`, 
      [name, category, alert_minimum || null, id]);

      res.status(200).json({ message: 'Item atualizado com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar item.' });
    }
  }
};

module.exports = inventoryController;