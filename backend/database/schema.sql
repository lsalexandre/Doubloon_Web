-- Adicionar campos à tabela de Itens existente
ALTER TABLE inventory_items 
ADD COLUMN sku VARCHAR(8) UNIQUE NOT NULL,
ADD COLUMN physical_stock INT DEFAULT 0,
ADD COLUMN virtual_stock INT DEFAULT 0,
ADD COLUMN alert_minimum INT DEFAULT NULL; -- NULL significa que não alerta

-- Nova Tabela: Clientes
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nova Tabela: Projetos e Kits (Work Orders)
CREATE TABLE work_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('kit', 'pedido') NOT NULL,
    name VARCHAR(255) NOT NULL,
    client_id INT,
    status ENUM('pendente', 'separado', 'entregue') DEFAULT 'pendente',
    priority INT DEFAULT 1,
    created_by VARCHAR(100), -- Usuário que criou
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Tabela de Relação: Itens dentro do Kit/Pedido
CREATE TABLE work_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT,
    item_id INT,
    quantity INT NOT NULL,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
);