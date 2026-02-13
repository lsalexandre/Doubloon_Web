const db = require('../config/db');

const movementController = {
  // Entrada em Lote (Nota Fiscal)
  processBatchEntry: async (req, res) => {
    // items = [{ item_id: 1, qty: 50 }, { item_id: 2, qty: 100 }]
    const { origin_reason, items } = req.body; 
    
    // Inicia uma transaction para garantir que ou salva tudo, ou desfaz tudo se der erro
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      for (const product of items) {
        // Na ENTRADA de Nota Fiscal, o Físico e o Virtual sobem juntos
        await connection.query(`
          UPDATE inventory_items 
          SET physical_stock = physical_stock + ?, 
              virtual_stock = virtual_stock + ? 
          WHERE id = ?`, 
        [product.qty, product.qty, product.item_id]);

        // Busca o nome do item para o Log ficar bonito
        const [[itemData]] = await connection.query('SELECT name FROM inventory_items WHERE id = ?', [product.item_id]);

        // Grava o Log com o Motivo/Origem
        await connection.query(`
          INSERT INTO logs (user, action, type, reference) 
          VALUES (?, ?, 'ENTRADA', ?)`, 
        [req.user.name, `Entrada Lote: ${product.qty} un. - ${itemData.name}`, origin_reason]);
      }

      await connection.commit();
      res.status(200).json({ message: 'Nota Fiscal processada e estoque atualizado!' });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ error: 'Falha ao processar lote. Nenhuma alteração foi salva.' });
    } finally {
      connection.release();
    }
  }
};

module.exports = movementController;