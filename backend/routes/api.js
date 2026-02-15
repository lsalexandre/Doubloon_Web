const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'chave_reserva_apenas_para_testes';

// ⚓ saveLog agora recebe o nome do usuário como terceiro parâmetro
const saveLog = async (desc, cat, user = 'SISTEMA') => {
  try {
    await db.query('INSERT INTO logs (description, category, username) VALUES ($1, $2, $3)', [desc, cat, user]);
  } catch (err) { console.error("Erro ao salvar log:", err.message); }
};

const recordMovement = async (itemId, qty, type, category) => {
  try {
    await db.query(
      'INSERT INTO inventory_movements (item_id, quantity, type, category) VALUES ($1, $2, $3, $4)',
      [itemId, qty, type, category]
    );
  } catch (err) { console.error("Erro ao registrar movimento analítico:", err.message); }
};

// ==========================================
// 🔐 AUTENTICAÇÃO
// ==========================================

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '8h' });
      // ⚓ Log de login registra o próprio usuário
      await saveLog(`Usuário ${username} logado no sistema`, 'SEGURANCA', username);
      res.json({ auth: true, token, username: user.username });
    } else {
      res.status(401).json({ auth: false, message: 'Usuário ou senha incorretos!' });
    }
  } catch (err) { res.status(500).send(err.message); }
});

const verifyJWT = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(401).json({ auth: false, message: 'Nenhum token fornecido.' });
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(500).json({ auth: false, message: 'Falha ao autenticar token.' });
    req.userId = decoded.id;
    req.username = decoded.username; // ⚓ Agora o servidor sabe quem é o autor da requisição
    next();
  });
};

// ==========================================
// 📦 INVENTÁRIO & CATEGORIAS
// ==========================================

router.get('/inventory', verifyJWT, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory_items ORDER BY category, name');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

router.get('/categories', verifyJWT, async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL');
    res.json(result.rows.map(r => r.category));
  } catch (err) { res.status(500).send(err.message); }
});

router.post('/inventory', verifyJWT, async (req, res) => {
  const { sku, name, category, alert_minimum } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO inventory_items (sku, name, category, physical_stock, virtual_stock, alert_minimum) VALUES ($1, $2, $3, 0, 0, $4) RETURNING *',
      [sku, name, category, alert_minimum]
    );
    await saveLog(`Novo item: ${name} (${sku})`, 'INVENTARIO', req.username);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 📝 EDIÇÃO DE ITEM (NOME, CATEGORIA, ALERTA)
// ==========================================
router.put('/inventory/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { name, category, alert_minimum } = req.body;

  try {
    const result = await db.query(
      'UPDATE inventory_items SET name = $1, category = $2, alert_minimum = $3 WHERE id = $4 RETURNING *',
      [name, category, alert_minimum, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item não encontrado no estoque." });
    }

    await saveLog(`Item Editado: ${name} (ID: ${id})`, 'INVENTARIO', req.username);
    res.json({ message: 'Item atualizado com sucesso!', item: result.rows[0] });
  } catch (err) {
    console.error("Erro ao editar item:", err.message);
    res.status(500).send(err.message);
  }
});

// ==========================================
// 🚛 MOVIMENTAÇÕES (COM REGISTRO ANALÍTICO)
// ==========================================

router.post('/inventory/move', verifyJWT, async (req, res) => {
  const { itemId, quantity, operation, reason, isRetroactive, date } = req.body;
  const qtyChange = operation === 'entrada' ? quantity : -quantity;
  try {
    const itemInfo = await db.query('SELECT category FROM inventory_items WHERE id = $1', [itemId]);
    const cat = itemInfo.rows[0]?.category;

    await db.query(
      'UPDATE inventory_items SET physical_stock = physical_stock + $1, virtual_stock = virtual_stock + $1 WHERE id = $2',
      [qtyChange, itemId]
    );

    if (isRetroactive && date) {
        await db.query(
            'INSERT INTO inventory_movements (item_id, quantity, type, category, created_at) VALUES ($1, $2, $3, $4, $5)',
            [itemId, qtyChange, 'fisico', cat, `${date} 12:00:00`]
        );
        await saveLog(`LANÇAMENTO PASSADO (${operation.toUpperCase()} - ${date}): ${quantity} un. Motivo: ${reason}`, 'MOVIMENTACAO', req.username);
    } else {
        await recordMovement(itemId, qtyChange, 'fisico', cat);
        await saveLog(`${operation.toUpperCase()}: ${quantity} un. Motivo: ${reason}`, 'MOVIMENTACAO', req.username);
    }
    
    res.json({ message: 'Movimentação concluída!' });
  } catch (err) { res.status(500).send(err.message); }
});

router.post('/inventory/bulk-move', verifyJWT, async (req, res) => {
  const { reason, items } = req.body; 
  try {
    for (let item of items) {
      const itemInfo = await db.query('SELECT category FROM inventory_items WHERE id = $1', [item.id]);
      await db.query(
        'UPDATE inventory_items SET physical_stock = physical_stock + $1, virtual_stock = virtual_stock + $1 WHERE id = $2',
        [item.quantity, item.id]
      );
      await recordMovement(item.id, item.quantity, 'fisico', itemInfo.rows[0]?.category);
    }
    await saveLog(`Entrada NF: ${reason} (${items.length} itens)`, 'MOVIMENTACAO', req.username);
    res.json({ message: 'Carga registrada!' });
  } catch (err) { res.status(500).send(err.message); }
});

// ==========================================
// ⚓ KITS & PROJETOS
// ==========================================

router.put('/work-orders/:id/status', verifyJWT, async (req, res) => {
  const { id } = req.params; 
  const { status } = req.body;
  
  try {
    const current = await db.query('SELECT status FROM work_orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).send("Ordem não encontrada");
    
    const currentStatus = current.rows[0].status;

    if (currentStatus === 'pendente' && status === 'separado') {
      const items = await db.query('SELECT item_id, quantity FROM work_order_items WHERE work_order_id = $1', [id]);
      for (let it of items.rows) {
        const itemInfo = await db.query('SELECT category FROM inventory_items WHERE id = $1', [it.item_id]);
        await db.query('UPDATE inventory_items SET virtual_stock = virtual_stock - $1 WHERE id = $2', [it.quantity, it.item_id]);
        await recordMovement(it.item_id, -it.quantity, 'virtual', itemInfo.rows[0]?.category);
      }
      await saveLog(`Separação Concluída: Materiais reservados para a OS-${id}.`, 'OPERACAO', req.username);  
    } 
    else if (currentStatus === 'separado' && status === 'pendente') {
        const items = await db.query('SELECT item_id, quantity FROM work_order_items WHERE work_order_id = $1', [id]);
        for (let it of items.rows) {
          const itemInfo = await db.query('SELECT category FROM inventory_items WHERE id = $1', [it.item_id]);
          await db.query('UPDATE inventory_items SET virtual_stock = virtual_stock + $1 WHERE id = $2', [it.quantity, it.item_id]);
          await recordMovement(it.item_id, it.quantity, 'virtual_estorno', itemInfo.rows[0]?.category); 
        }
      await saveLog(`Estorno Virtual: OS-${id} voltou para PENDENTE.`, 'OPERACAO', req.username);
    }
    else if (currentStatus === 'separado' && status === 'entregue') {
        const items = await db.query('SELECT item_id, quantity FROM work_order_items WHERE work_order_id = $1', [id]);
        for (let it of items.rows) {
          const itemInfo = await db.query('SELECT category FROM inventory_items WHERE id = $1', [it.item_id]);
          await db.query('UPDATE inventory_items SET physical_stock = physical_stock - $1 WHERE id = $2', [it.quantity, it.item_id]);
          await recordMovement(it.item_id, -it.quantity, 'fisico', itemInfo.rows[0]?.category); 
        }
        await saveLog(`Entrega Confirmada: Itens da OS-${id} saíram do estoque físico.`, 'OPERACAO', req.username);
    }
    
    await db.query('UPDATE work_orders SET status = $1 WHERE id = $2', [status, id]);
    res.json({ message: 'Status atualizado!' });
  } catch (err) { 
    console.error("Erro no processamento de status:", err.message);
    res.status(500).send(err.message); 
  }
});

router.get('/work-orders', verifyJWT, async (req, res) => {
  const { status, date } = req.query;
  let query = 'SELECT * FROM work_orders WHERE 1=1';
  let params = [];

  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  if (date) {
    params.push(`${date} 00:00:00`, `${date} 23:59:59`);
    query += ` AND created_at BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  query += ' ORDER BY priority DESC, created_at DESC';
  
  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

router.get('/work-orders/:id', verifyJWT, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM work_orders WHERE id = $1', [req.params.id]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ message: 'Ordem não encontrada.' });
      }
    } catch (err) { res.status(500).send(err.message); }
  });

router.post('/work-orders', verifyJWT, async (req, res) => {
  const { name, type, items, priority } = req.body;
  const order = await db.query('INSERT INTO work_orders (name, type, status, priority) VALUES ($1, $2, $3, $4) RETURNING id', [name, type, 'pendente', priority]);
  const orderId = order.rows[0].id;
  for (let item of items) {
    await db.query('INSERT INTO work_order_items (work_order_id, item_id, quantity) VALUES ($1, $2, $3)', [orderId, item.id, item.quantity]);
  }
  await saveLog(`Criado ${type}: ${name}`, 'OPERACAO', req.username);
  res.json({ id: orderId });
});

router.get('/work-orders/:id/items', verifyJWT, async (req, res) => {
  const result = await db.query('SELECT i.id, i.name, i.sku, woi.quantity FROM work_order_items woi JOIN inventory_items i ON i.id = woi.item_id WHERE woi.work_order_id = $1', [req.params.id]);
  res.json(result.rows);
});

router.put('/work-orders/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { name, priority, items } = req.body;

  try {
    await db.query(
      'UPDATE work_orders SET name = $1, priority = $2 WHERE id = $3',
      [name, priority, id]
    );

    await db.query('DELETE FROM work_order_items WHERE work_order_id = $1', [id]);
    
    for (let item of items) {
      await db.query(
        'INSERT INTO work_order_items (work_order_id, item_id, quantity) VALUES ($1, $2, $3)',
        [id, item.id, item.quantity]
      );
    }

    await saveLog(`Editado OS-${id}: ${name} (Prioridade: ${priority})`, 'OPERACAO', req.username);
    res.json({ message: 'Ordem de serviço atualizada com sucesso!' });
  } catch (err) {
    console.error("Erro ao atualizar OS:", err.message);
    res.status(500).send(err.message);
  }
});

router.delete('/work-orders/:id', verifyJWT, async (req, res) => {
    const { id } = req.params;
    try {
      const check = await db.query('SELECT status FROM work_orders WHERE id = $1', [id]);
      if (check.rows[0].status === 'entregue') {
        return res.status(403).send("Não é possível cancelar uma ordem que já foi entregue.");
      }
      await db.query('DELETE FROM work_order_items WHERE work_order_id = $1', [id]);
      await db.query('DELETE FROM work_orders WHERE id = $1', [id]);
      await saveLog(`Ordem OS-${id} cancelada`, 'SISTEMA', req.username);
      res.json({ message: 'Cancelado com sucesso' });
    } catch (err) { res.status(500).send(err.message); }
  });

// ==========================================
// 📊 ANALYTICS & DASHBOARD 
// ==========================================

router.get('/dashboard-stats', verifyJWT, async (req, res) => {
  try {
    const kits = await db.query("SELECT COUNT(*) as total, EXISTS(SELECT 1 FROM work_orders WHERE type='kit' AND status='pendente') as pending FROM work_orders WHERE type='kit' AND status != 'entregue'");
    const projetos = await db.query("SELECT COUNT(*) as total, EXISTS(SELECT 1 FROM work_orders WHERE type='pedido' AND status='pendente') as pending FROM work_orders WHERE type='pedido' AND status != 'entregue'");
    const critical = await db.query("SELECT COUNT(*) FROM inventory_items WHERE alert_minimum > 0 AND virtual_stock < alert_minimum");
    res.json({ kits: kits.rows[0], projetos: projetos.rows[0], criticalCount: parseInt(critical.rows[0].count) });
  } catch (err) { res.status(500).send(err.message); }
});

router.get('/analytics/history', verifyJWT, async (req, res) => {
  const { period, category } = req.query;
  let interval = '7 days';
  let grouping = 'day';

  if (period === '30 DIAS') interval = '30 days';
  if (period === '6 MESES') { interval = '6 months'; grouping = 'month'; }
  if (period === '1 ANO') { interval = '1 year'; grouping = 'month'; }

  let query = `
    SELECT 
      TO_CHAR(DATE_TRUNC($1, created_at), ${grouping === 'day' ? "'DD/MM'" : "'MM/YY'"}) as label,
      SUM(ABS(quantity)) as volume
    FROM inventory_movements
    WHERE type = 'fisico' 
      AND created_at >= CURRENT_DATE - CAST($2 AS INTERVAL)
  `;
  let params = [grouping, interval];

  if (category && category !== 'TODAS') {
    params.push(category);
    query += ` AND category = $3`;
  }

  query += ` GROUP BY 1 ORDER BY MIN(created_at) ASC`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { 
    console.error("Erro no gráfico histórico:", err.message);
    res.status(500).send(err.message); 
  }
});

router.get('/logs', verifyJWT, async (req, res) => {
  const { startDate, endDate, category, search, limit } = req.query;
  let query = 'SELECT * FROM logs WHERE 1=1';
  let params = [];

  if (category && category !== 'TODAS') { 
    params.push(category); 
    query += ` AND category = $${params.length}`; 
  }
  
  if (startDate) { 
    params.push(`${startDate} 00:00:00`); 
    query += ` AND created_at >= $${params.length}`; 
  }
  
  if (endDate) { 
    params.push(`${endDate} 23:59:59`); 
    query += ` AND created_at <= $${params.length}`; 
  }

  if (search && search.trim() !== '') {
    params.push(`%${search.trim().toLowerCase()}%`);
    query += ` AND LOWER(description) LIKE $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT ${limit || 1000}`;
  
  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// ⚓ A TIMELINE AGORA BUSCA TAMBÉM O USERNAME
router.get('/analytics/timeline', verifyJWT, async (req, res) => {
  try {
    const query = `
      SELECT id, description, category, username, created_at
      FROM logs
      WHERE category IN ('OPERACAO', 'MOVIMENTACAO', 'SISTEMA', 'INVENTARIO')
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro na rota da Timeline:", err.message);
    res.status(500).send("Erro ao processar dados da linha do tempo.");
  }
});

module.exports = router;