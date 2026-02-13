const db = require('../config/db');

const workOrderController = {
  
  // 1. Criar Kit ou Projeto (Fase: PENDENTE) - NÃO MEXE NO ESTOQUE
  createWorkOrder: async (req, res) => {
    const { type, name, client_id, items } = req.body;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Cria a "Capa" do pedido
      const [orderResult] = await connection.query(`
        INSERT INTO work_orders (type, name, client_id, status, created_by) 
        VALUES (?, ?, ?, 'pendente', ?)`, 
      [type, name, client_id, req.user.name]);

      const orderId = orderResult.insertId;

      // Insere os itens na lista do kit
      for (const item of items) {
        await connection.query(`
          INSERT INTO work_order_items (work_order_id, item_id, quantity) 
          VALUES (?, ?, ?)`, 
        [orderId, item.item_id, item.qty]);
      }

      await connection.query(`INSERT INTO logs (user, action, type) VALUES (?, ?, 'CRIACAO')`, 
        [req.user.name, `Criou ${type}: ${name}`]);

      await connection.commit();
      res.status(201).json({ message: `${type} criado e adicionado à fila de pendentes!` });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ error: `Erro ao criar ${type}.` });
    } finally {
      connection.release();
    }
  },

  // 2. Mudar Status (A Máquina de Estados)
  changeStatus: async (req, res) => {
    const { id } = params; // ID do Kit/Projeto
    const { newStatus } = req.body; // 'pendente', 'separado', ou 'entregue'
    
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Pega o status atual e os itens do kit
      const [[order]] = await connection.query('SELECT status, name FROM work_orders WHERE id = ?', [id]);
      const [items] = await connection.query('SELECT item_id, quantity FROM work_order_items WHERE work_order_id = ?', [id]);

      // LÓGICA 1: Pendente -> Separado (Reserva o Estoque Virtual)
      if (order.status === 'pendente' && newStatus === 'separado') {
        for (const item of items) {
          await connection.query(`UPDATE inventory_items SET virtual_stock = virtual_stock - ? WHERE id = ?`, [item.quantity, item.item_id]);
        }
      }
      
      // LÓGICA 2: Separado -> Pendente (Desfaz a reserva, caso editem o kit)
      else if (order.status === 'separado' && newStatus === 'pendente') {
        for (const item of items) {
          await connection.query(`UPDATE inventory_items SET virtual_stock = virtual_stock + ? WHERE id = ?`, [item.quantity, item.item_id]);
        }
      }

      // LÓGICA 3: Separado -> Entregue (Expedição! Debita o Físico. O Virtual não mexe pq já foi debitado na separação)
      else if (order.status === 'separado' && newStatus === 'entregue') {
        for (const item of items) {
          await connection.query(`UPDATE inventory_items SET physical_stock = physical_stock - ? WHERE id = ?`, [item.quantity, item.item_id]);
        }
      }

      // Atualiza o status no banco
      await connection.query('UPDATE work_orders SET status = ? WHERE id = ?', [newStatus, id]);

      // Registra no Log
      await connection.query(`INSERT INTO logs (user, action, type) VALUES (?, ?, 'STATUS')`, 
        [req.user.name, `Alterou status do projeto ${order.name} para ${newStatus.toUpperCase()}`]);

      await connection.commit();
      res.status(200).json({ message: `Status alterado para ${newStatus} com sucesso!` });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ error: 'Erro ao processar alteração de estoque.' });
    } finally {
      connection.release();
    }
  }
};

module.exports = workOrderController;