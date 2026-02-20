const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ou '../db' dependendo de onde está o seu arquivo
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // ⚓ Nossa nova armadura

const SECRET_KEY = process.env.JWT_SECRET || 'chave_reserva_apenas_para_testes';

// ==========================================
// 🔔 ROTA DE DESPERTAR (PING) - NOVA!
// ==========================================
// O frontend chamará isso para saber se o Render acordou
router.get('/ping', (req, res) => {
  res.status(200).json({ status: 'awake', message: 'Estou acordado, Capitão!' });
});

// ⚓ Função Auxiliar de Logs
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
// 🔐 AUTENTICAÇÃO INTELIGENTE (COM BCRYPT)
// ==========================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // 1. Busca o usuário no banco
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ auth: false, message: 'Usuário não encontrado!' });
    }

    const user = result.rows[0];
    let passwordMatch = false;

    // 2. Tenta verificar se a senha salva já está protegida pelo Bcrypt (começa com $2a$ ou $2b$)
    if (user.password.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } 
    // 3. Se não estiver protegida, compara como texto simples (Modo de Migração)
    else if (user.password === password) {
      passwordMatch = true;
      
      // ⚓ A MÁGICA: Criptografa a senha antiga agora mesmo e salva de volta no banco!
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
      console.log(`🔒 Senha do usuário ${username} migrada para Bcrypt com sucesso!`);
    }

    // 4. Se a senha bater (seja texto ou hash), libera o acesso
    if (passwordMatch) {
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '8h' });
      await saveLog(`Usuário ${username} logado no sistema`, 'SEGURANCA', username);
      res.json({ auth: true, token, username: user.username });
    } else {
      res.status(401).json({ auth: false, message: 'Senha incorreta!' });
    }
    
  } catch (err) { 
    console.error("Erro no login:", err.message);
    res.status(500).send("Erro interno do servidor."); 
  }
});

const verifyJWT = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(401).json({ auth: false, message: 'Nenhum token fornecido.' });
  
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    // Se o token for inválido, manda um erro especial para forçar o logout no frontend
    if (err) return res.status(403).json({ auth: false, message: 'Token expirado ou inválido. Faça login novamente.' });
    
    req.userId = decoded.id;
    req.username = decoded.username; 
    next();
  });
};

// ==========================================
// 📦 INVENTÁRIO & CATEGORIAS (MANTIDAS INTACTAS)
// ==========================================

router.get('/inventory', verifyJWT, async (req, res) => {
  try {
    // ⚓ Agora só busca os itens que estão ativos (active = true)
    const result = await db.query('SELECT * FROM inventory_items WHERE active = true ORDER BY category, name');
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

router.put('/inventory/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { name, category, alert_minimum } = req.body;
  try {
    const result = await db.query(
      'UPDATE inventory_items SET name = $1, category = $2, alert_minimum = $3 WHERE id = $4 RETURNING *',
      [name, category, alert_minimum, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Item não encontrado no estoque." });
    await saveLog(`Item Editado: ${name} (ID: ${id})`, 'INVENTARIO', req.username);
    res.json({ message: 'Item atualizado com sucesso!', item: result.rows[0] });
  } catch (err) { res.status(500).send(err.message); }
});

router.delete('/inventory/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  try {
    // ⚓ Soft Delete: Em vez de usar DELETE FROM, usamos UPDATE para "esconder" a peça
    await db.query('UPDATE inventory_items SET active = false WHERE id = $1', [id]);
    
    await saveLog(`Item Desativado/Excluído (ID: ${id})`, 'INVENTARIO', req.username);
    res.json({ message: 'Peça desativada com sucesso!' });
  } catch (err) { 
    console.error("Erro ao excluir item:", err.message);
    res.status(500).send(err.message); 
  }
});

// ==========================================
// 🚛 MOVIMENTAÇÕES (MANTIDAS INTACTAS)
// ==========================================

router.post('/inventory/move', verifyJWT, async (req, res) => {
  const { itemId, quantity, operation, reason, isRetroactive, date } = req.body;
  const qtyChange = operation === 'entrada' ? quantity : -quantity;
  try {
    const itemInfo = await db.query('SELECT category FROM inventory_items WHERE id = $1', [itemId]);
    const cat = itemInfo.rows[0]?.category;

    await db.query('UPDATE inventory_items SET physical_stock = physical_stock + $1, virtual_stock = virtual_stock + $1 WHERE id = $2', [qtyChange, itemId]);

    if (isRetroactive && date) {
        await db.query('INSERT INTO inventory_movements (item_id, quantity, type, category, created_at) VALUES ($1, $2, $3, $4, $5)', [itemId, qtyChange, 'fisico', cat, `${date} 12:00:00`]);
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
      await db.query('UPDATE inventory_items SET physical_stock = physical_stock + $1, virtual_stock = virtual_stock + $1 WHERE id = $2', [item.quantity, item.id]);
      await recordMovement(item.id, item.quantity, 'fisico', itemInfo.rows[0]?.category);
    }
    await saveLog(`Entrada NF: ${reason} (${items.length} itens)`, 'MOVIMENTACAO', req.username);
    res.json({ message: 'Carga registrada!' });
  } catch (err) { res.status(500).send(err.message); }
});

// ==========================================
// ⚓ KITS & PROJETOS (MANTIDOS INTACTOS)
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
  } catch (err) { res.status(500).send(err.message); }
});

router.get('/work-orders', verifyJWT, async (req, res) => {
  const { status, date } = req.query;
  let query = 'SELECT * FROM work_orders WHERE 1=1';
  let params = [];
  if (status) { params.push(status); query += ` AND status = $${params.length}`; }
  if (date) { params.push(`${date} 00:00:00`, `${date} 23:59:59`); query += ` AND created_at BETWEEN $${params.length - 1} AND $${params.length}`; }
  query += ' ORDER BY priority DESC, created_at DESC';
  try { res.json((await db.query(query, params)).rows); } catch (err) { res.status(500).send(err.message); }
});

router.get('/work-orders/:id', verifyJWT, async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM work_orders WHERE id = $1', [req.params.id]);
      if (result.rows.length > 0) res.json(result.rows[0]);
      else res.status(404).json({ message: 'Ordem não encontrada.' });
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/work-orders', verifyJWT, async (req, res) => {
  const { name, type, items, priority } = req.body;
  const order = await db.query('INSERT INTO work_orders (name, type, status, priority) VALUES ($1, $2, $3, $4) RETURNING id', [name, type, 'pendente', priority]);
  for (let item of items) await db.query('INSERT INTO work_order_items (work_order_id, item_id, quantity) VALUES ($1, $2, $3)', [order.rows[0].id, item.id, item.quantity]);
  await saveLog(`Criado ${type}: ${name}`, 'OPERACAO', req.username);
  res.json({ id: order.rows[0].id });
});

router.get('/work-orders/:id/items', verifyJWT, async (req, res) => {
  res.json((await db.query('SELECT i.id, i.name, i.sku, woi.quantity FROM work_order_items woi JOIN inventory_items i ON i.id = woi.item_id WHERE woi.work_order_id = $1', [req.params.id])).rows);
});

router.put('/work-orders/:id', verifyJWT, async (req, res) => {
  const { id } = req.params; const { name, priority, items } = req.body;
  try {
    await db.query('UPDATE work_orders SET name = $1, priority = $2 WHERE id = $3', [name, priority, id]);
    await db.query('DELETE FROM work_order_items WHERE work_order_id = $1', [id]);
    for (let item of items) await db.query('INSERT INTO work_order_items (work_order_id, item_id, quantity) VALUES ($1, $2, $3)', [id, item.id, item.quantity]);
    await saveLog(`Editado OS-${id}: ${name} (Prioridade: ${priority})`, 'OPERACAO', req.username);
    res.json({ message: 'Ordem de serviço atualizada com sucesso!' });
  } catch (err) { res.status(500).send(err.message); }
});

router.delete('/work-orders/:id', verifyJWT, async (req, res) => {
    const { id } = req.params;
    try {
      if ((await db.query('SELECT status FROM work_orders WHERE id = $1', [id])).rows[0].status === 'entregue') return res.status(403).send("Não pode cancelar ordem entregue.");
      await db.query('DELETE FROM work_order_items WHERE work_order_id = $1', [id]);
      await db.query('DELETE FROM work_orders WHERE id = $1', [id]);
      await saveLog(`Ordem OS-${id} cancelada`, 'SISTEMA', req.username);
      res.json({ message: 'Cancelado com sucesso' });
    } catch (err) { res.status(500).send(err.message); }
});

// ==========================================
// 📊 ANALYTICS & DASHBOARD (MANTIDOS INTACTOS)
// ==========================================

router.get('/dashboard-stats', verifyJWT, async (req, res) => {
  try {
    res.json({
      kits: (await db.query("SELECT COUNT(*) as total, EXISTS(SELECT 1 FROM work_orders WHERE type='kit' AND status='pendente') as pending FROM work_orders WHERE type='kit' AND status != 'entregue'")).rows[0],
      projetos: (await db.query("SELECT COUNT(*) as total, EXISTS(SELECT 1 FROM work_orders WHERE type='pedido' AND status='pendente') as pending FROM work_orders WHERE type='pedido' AND status != 'entregue'")).rows[0],
      criticalCount: parseInt((await db.query("SELECT COUNT(*) FROM inventory_items WHERE alert_minimum > 0 AND virtual_stock < alert_minimum")).rows[0].count)
    });
  } catch (err) { res.status(500).send(err.message); }
});

router.get('/analytics/history', verifyJWT, async (req, res) => {
  const { period, category } = req.query;
  let interval = '7 days'; let grouping = 'day';
  if (period === '30 DIAS') interval = '30 days';
  if (period === '6 MESES') { interval = '6 months'; grouping = 'month'; }
  if (period === '1 ANO') { interval = '1 year'; grouping = 'month'; }
  let query = `SELECT TO_CHAR(DATE_TRUNC($1, created_at), ${grouping === 'day' ? "'DD/MM'" : "'MM/YY'"}) as label, SUM(ABS(quantity)) as volume FROM inventory_movements WHERE type = 'fisico' AND created_at >= CURRENT_DATE - CAST($2 AS INTERVAL)`;
  let params = [grouping, interval];
  if (category && category !== 'TODAS') { params.push(category); query += ` AND category = $3`; }
  query += ` GROUP BY 1 ORDER BY MIN(created_at) ASC`;
  try { res.json((await db.query(query, params)).rows); } catch (err) { res.status(500).send(err.message); }
});

router.get('/logs', verifyJWT, async (req, res) => {
  const { startDate, endDate, category, search, limit } = req.query;
  let query = 'SELECT * FROM logs WHERE 1=1'; let params = [];
  if (category && category !== 'TODAS') { params.push(category); query += ` AND category = $${params.length}`; }
  if (startDate) { params.push(`${startDate} 00:00:00`); query += ` AND created_at >= $${params.length}`; }
  if (endDate) { params.push(`${endDate} 23:59:59`); query += ` AND created_at <= $${params.length}`; }
  if (search && search.trim() !== '') { params.push(`%${search.trim().toLowerCase()}%`); query += ` AND LOWER(description) LIKE $${params.length}`; }
  query += ` ORDER BY created_at DESC LIMIT ${limit || 1000}`;
  try { res.json((await db.query(query, params)).rows); } catch (err) { res.status(500).send(err.message); }
});

router.get('/analytics/timeline', verifyJWT, async (req, res) => {
  try { res.json((await db.query(`SELECT id, description, category, username, created_at FROM logs WHERE category IN ('OPERACAO', 'MOVIMENTACAO', 'SISTEMA', 'INVENTARIO') ORDER BY created_at DESC LIMIT 10`)).rows); } 
  catch (err) { res.status(500).send("Erro ao processar dados da linha do tempo."); }
});

module.exports = router;