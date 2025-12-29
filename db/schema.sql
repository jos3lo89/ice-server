-- ============================================
-- ICE MANKORA - ESTRUCTURA DE BASE DE DATOS
-- ============================================

-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================
-- TIPOS ENUMERADOS
-- ============================================

CREATE TYPE user_role AS ENUM (
    'ADMIN', 
    'CAJERO', 
    'MESERO', 
    'BARTENDER', 
    'COCINERO'
);

CREATE TYPE table_status AS ENUM (
    'LIBRE', 
    'OCUPADA', 
    'RESERVADA', 
    'LIMPIEZA'
);

CREATE TYPE order_status AS ENUM (
    'ABIERTA',
    'CERRADA',
    'PARCIALMENTE_PAGADA',
    'PAGADA',
    'CANCELADA'
);

CREATE TYPE order_item_status AS ENUM (
    'PENDIENTE',
    'ENVIADO',
    'EN_PREPARACION',
    'LISTO',
    'ENTREGADO'
);

CREATE TYPE payment_method AS ENUM (
    'EFECTIVO',
    'TARJETA_VISA',
    'TARJETA_MASTERCARD',
    'TARJETA_AMEX',
    'YAPE',
    'PLIN',
    'TRANSFERENCIA'
);

CREATE TYPE comprobante_type AS ENUM (
    'TICKET',
    'BOLETA',
    'FACTURA'
);

CREATE TYPE estado_sunat AS ENUM (
    'NO_APLICA',
    'PENDIENTE',
    'ENVIANDO',
    'ACEPTADO',
    'RECHAZADO',
    'OBSERVADO',
    'ANULADO'
);

CREATE TYPE tipo_documento_identidad AS ENUM (
    'SIN_DOC',
    'DNI',
    'CARNET_EXT',
    'RUC',
    'PASAPORTE'
);

CREATE TYPE area_preparacion AS ENUM (
    'COCINA',
    'BAR',
    'BEBIDAS',
    'CAJA'
);

CREATE TYPE cash_register_status AS ENUM (
    'ABIERTA', 
    'CERRADA'
);

CREATE TYPE cash_movement_type AS ENUM (
    'INGRESO', 
    'EGRESO'
);

CREATE TYPE tipo_nota_credito AS ENUM (
    'ANULACION_OPERACION',
    'ANULACION_ERROR_RUC',
    'CORRECCION_DESCRIPCION',
    'DESCUENTO_GLOBAL',
    'DESCUENTO_ITEM',
    'DEVOLUCION_TOTAL',
    'DEVOLUCION_ITEM',
    'BONIFICACION',
    'DISMINUCION_VALOR',
    'OTROS'
);


-- ============================================
-- TABLAS
-- ============================================

-- 1. Configuración del Sistema
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2. Correlativos de Comprobantes
CREATE TABLE correlatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento VARCHAR(2) NOT NULL,
    serie VARCHAR(4) NOT NULL,
    correlativo_actual INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tipo_documento, serie)
);


-- 3. Pisos del Restaurante
CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. Impresoras
CREATE TABLE printers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    connection_type VARCHAR(20) NOT NULL,
    address VARCHAR(255),
    area area_preparacion NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    dni VARCHAR(8) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'MESERO',
    pin VARCHAR(6),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. Relación Usuarios-Pisos
CREATE TABLE user_floors (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, floor_id)
);


-- 7. Categorías de Productos
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    default_area area_preparacion DEFAULT 'COCINA',
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(7),
    image_path VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 8. Productos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    unidad_medida VARCHAR(3) DEFAULT 'NIU',
    codigo_producto VARCHAR(30),
    afectacion_igv VARCHAR(2) DEFAULT '10',
    aplica_icbper BOOLEAN DEFAULT FALSE,
    area_preparacion area_preparacion NOT NULL,
    is_stock_managed BOOLEAN DEFAULT FALSE,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    image_path VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 9. Grupos de Variantes
CREATE TABLE variant_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    max_selections INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 10. Opciones de Variantes
CREATE TABLE variant_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_group_id UUID NOT NULL REFERENCES variant_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 11. Mesas
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    name VARCHAR(50),
    capacity INTEGER DEFAULT 4,
    status table_status DEFAULT 'LIBRE',
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(floor_id, number)
);


-- 12. Clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento tipo_documento_identidad DEFAULT 'SIN_DOC',
    numero_documento VARCHAR(15) NOT NULL,
    razon_social VARCHAR(500) NOT NULL,
    nombre_comercial VARCHAR(255),
    direccion VARCHAR(500),
    ubigeo VARCHAR(6),
    email VARCHAR(100),
    telefono VARCHAR(20),
    total_purchases DECIMAL(12,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tipo_documento, numero_documento)
);


-- 13. Órdenes (Comandas)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_number INTEGER NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    table_id UUID NOT NULL REFERENCES tables(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status order_status DEFAULT 'ABIERTA',
    diners_count INTEGER DEFAULT 1,
    notes TEXT,
    subtotal DECIMAL(12,2) DEFAULT 0,
    total_cancelled DECIMAL(12,2) DEFAULT 0,
    total_paid DECIMAL(12,2) DEFAULT 0,
    total_pending DECIMAL(12,2) DEFAULT 0,
    is_split_payment BOOLEAN DEFAULT FALSE,
    split_payment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(daily_number, order_date)
);


-- 14. Items de Orden
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_short_name VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    variants_snapshot JSONB,
    variants_total DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,
    status order_item_status DEFAULT 'PENDIENTE',
    area_preparacion area_preparacion NOT NULL,
    sent_to_kitchen_at TIMESTAMPTZ,
    printed_at TIMESTAMPTZ,
    printer_id UUID REFERENCES printers(id),
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancel_reason TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    payment_id UUID,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 15. Caja Registradora
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    open_time TIMESTAMPTZ DEFAULT NOW(),
    close_time TIMESTAMPTZ,
    initial_amount DECIMAL(12,2) NOT NULL,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_income DECIMAL(12,2) DEFAULT 0,
    total_expense DECIMAL(12,2) DEFAULT 0,
    expected_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2),
    difference DECIMAL(12,2),
    status cash_register_status DEFAULT 'ABIERTA',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 16. Movimientos de Caja
CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    type cash_movement_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    is_automatic BOOLEAN DEFAULT FALSE,
    payment_id UUID,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 17. Pagos
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id),
    payment_number INTEGER NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    amount_received DECIMAL(12,2),
    change_given DECIMAL(12,2),
    payer_name VARCHAR(255),
    payer_notes TEXT,
    sale_id UUID,
    processed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 18. Items de Pago
CREATE TABLE payment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity_paid INTEGER NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(payment_id, order_item_id)
);


-- 19. Ventas (Comprobantes)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_comprobante comprobante_type NOT NULL,
    serie VARCHAR(4) NOT NULL,
    correlativo INTEGER NOT NULL,
    numero_completo VARCHAR(15) UNIQUE NOT NULL,
    fecha_emision TIMESTAMPTZ DEFAULT NOW(),
    fecha_vencimiento TIMESTAMPTZ,
    tipo_moneda VARCHAR(3) DEFAULT 'PEN',
    order_id UUID REFERENCES orders(id),
    payment_id UUID REFERENCES payments(id),
    client_id UUID REFERENCES clients(id),
    user_id UUID NOT NULL REFERENCES users(id),
    cash_register_id UUID REFERENCES cash_registers(id),
    payment_method payment_method NOT NULL,
    forma_pago VARCHAR(20) DEFAULT 'Contado',
    monto_gravado DECIMAL(12,2) DEFAULT 0,
    monto_exonerado DECIMAL(12,2) DEFAULT 0,
    monto_inafecto DECIMAL(12,2) DEFAULT 0,
    monto_gratuito DECIMAL(12,2) DEFAULT 0,
    monto_igv DECIMAL(12,2) DEFAULT 0,
    monto_icbper DECIMAL(12,2) DEFAULT 0,
    total_impuestos DECIMAL(12,2) DEFAULT 0,
    valor_venta DECIMAL(12,2) DEFAULT 0,
    precio_venta_total DECIMAL(12,2) NOT NULL,
    monto_pagado DECIMAL(12,2),
    vuelto DECIMAL(12,2),
    monto_letras VARCHAR(500),
    estado_sunat estado_sunat DEFAULT 'NO_APLICA',
    xml_path VARCHAR(500),
    pdf_path VARCHAR(500),
    cdr_path VARCHAR(500),
    sunat_hash VARCHAR(100),
    sunat_code VARCHAR(10),
    sunat_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 20. Items de Venta
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id),
    product_id UUID REFERENCES products(id),
    codigo_producto VARCHAR(30),
    descripcion VARCHAR(500) NOT NULL,
    unidad_medida VARCHAR(3) NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    mto_valor_unitario DECIMAL(12,10) NOT NULL,
    mto_precio_unitario DECIMAL(12,10) NOT NULL,
    mto_valor_venta DECIMAL(12,2) NOT NULL,
    afectacion_igv VARCHAR(2) NOT NULL,
    porcentaje_igv DECIMAL(5,2) DEFAULT 18.00,
    mto_base_igv DECIMAL(12,2) DEFAULT 0,
    mto_igv DECIMAL(12,2) DEFAULT 0,
    mto_icbper DECIMAL(12,2) DEFAULT 0,
    total_impuestos DECIMAL(12,2) DEFAULT 0,
    variantes_descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 21. Notas de Crédito
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id),
    user_id UUID NOT NULL REFERENCES users(id),
    serie VARCHAR(4) NOT NULL,
    correlativo VARCHAR(8) NOT NULL,
    numero_completo VARCHAR(15) UNIQUE NOT NULL,
    fecha_emision TIMESTAMPTZ DEFAULT NOW(),
    sale_id UUID REFERENCES sales(id),
    tipo_doc_ref VARCHAR(2) NOT NULL,
    serie_ref VARCHAR(4) NOT NULL,
    correlativo_ref VARCHAR(8) NOT NULL,
    tipo_nota tipo_nota_credito NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    valor_venta DECIMAL(12,2) DEFAULT 0,
    monto_igv DECIMAL(12,2) DEFAULT 0,
    total_impuestos DECIMAL(12,2) DEFAULT 0,
    mto_imp_venta DECIMAL(12,2) NOT NULL,
    xml_path VARCHAR(500),
    pdf_path VARCHAR(500),
    cdr_path VARCHAR(500),
    estado_sunat estado_sunat DEFAULT 'PENDIENTE',
    sunat_hash VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 22. Items de Nota de Crédito
CREATE TABLE credit_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    cantidad DECIMAL(12,3) NOT NULL,
    unidad_medida VARCHAR(3) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    mto_valor_unitario DECIMAL(12,10) NOT NULL,
    mto_precio_unitario DECIMAL(12,10) NOT NULL,
    mto_valor_venta DECIMAL(12,2) NOT NULL,
    afectacion_igv VARCHAR(2) NOT NULL,
    mto_igv DECIMAL(12,2) DEFAULT 0,
    total_impuestos DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 23. Resúmenes Diarios
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identificador VARCHAR(20) UNIQUE NOT NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_referencia DATE NOT NULL,
    sales_ids UUID[] NOT NULL,
    sales_count INTEGER NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    xml_path VARCHAR(500),
    cdr_path VARCHAR(500),
    estado_sunat estado_sunat DEFAULT 'PENDIENTE',
    ticket_sunat VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 24. Documentos Anulados
CREATE TABLE voided_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identificador VARCHAR(20) UNIQUE NOT NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_referencia DATE NOT NULL,
    sale_id UUID REFERENCES sales(id),
    tipo_documento VARCHAR(2) NOT NULL,
    serie VARCHAR(4) NOT NULL,
    correlativo VARCHAR(8) NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    xml_path VARCHAR(500),
    cdr_path VARCHAR(500),
    estado_sunat estado_sunat DEFAULT 'PENDIENTE',
    ticket_sunat VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 25. Reservaciones
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES tables(id),
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_hours DECIMAL(3,1) DEFAULT 2,
    diners_count INTEGER NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'CONFIRMADA',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 26. Historial de Órdenes
CREATE TABLE order_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    order_daily_number INTEGER NOT NULL,
    order_date DATE NOT NULL,
    table_number INTEGER NOT NULL,
    floor_name VARCHAR(100) NOT NULL,
    waiter_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    total_items INTEGER NOT NULL,
    was_split_payment BOOLEAN DEFAULT FALSE,
    payment_count INTEGER DEFAULT 1,
    sales_generated JSONB,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 27. Auditoría
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- ÍNDICES
-- ============================================

-- Categorías
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- Productos
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_area ON products(area_preparacion);
CREATE INDEX idx_products_active ON products(is_active, is_available);
CREATE INDEX idx_products_name ON products USING gin(name gin_trgm_ops);

-- Variantes
CREATE INDEX idx_variant_groups_product ON variant_groups(product_id);
CREATE INDEX idx_variant_options_group ON variant_options(variant_group_id);

-- Mesas
CREATE INDEX idx_tables_floor_status ON tables(floor_id, status);

-- Clientes
CREATE INDEX idx_clients_documento ON clients(numero_documento);
CREATE INDEX idx_clients_razon_social ON clients USING gin(razon_social gin_trgm_ops);

-- Órdenes
CREATE INDEX idx_orders_date ON orders(order_date, daily_number);
CREATE INDEX idx_orders_table ON orders(table_id, status);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('PAGADA', 'CANCELADA');
CREATE INDEX idx_orders_user ON orders(user_id);

-- Items de Orden
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status, area_preparacion);
CREATE INDEX idx_order_items_pending ON order_items(order_id) WHERE is_cancelled = FALSE AND is_paid = FALSE;
CREATE INDEX idx_order_items_to_print ON order_items(area_preparacion) WHERE sent_to_kitchen_at IS NULL AND is_cancelled = FALSE;
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Caja
CREATE INDEX idx_cash_registers_status ON cash_registers(status);
CREATE INDEX idx_cash_registers_user ON cash_registers(user_id);
CREATE INDEX idx_cash_movements_register ON cash_movements(cash_register_id);

-- Pagos
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_cash_register ON payments(cash_register_id);
CREATE INDEX idx_payment_items_payment ON payment_items(payment_id);
CREATE INDEX idx_payment_items_order_item ON payment_items(order_item_id);

-- Ventas
CREATE INDEX idx_sales_fecha ON sales(fecha_emision);
CREATE INDEX idx_sales_numero ON sales(numero_completo);
CREATE INDEX idx_sales_order ON sales(order_id);
CREATE INDEX idx_sales_payment ON sales(payment_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_estado_sunat ON sales(estado_sunat) WHERE estado_sunat != 'NO_APLICA';

-- Items de Venta
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- Notas de Crédito
CREATE INDEX idx_credit_notes_sale ON credit_notes(sale_id);
CREATE INDEX idx_credit_notes_fecha ON credit_notes(fecha_emision);

-- Reservaciones
CREATE INDEX idx_reservations_date ON reservations(reservation_date, reservation_time);
CREATE INDEX idx_reservations_table ON reservations(table_id);

-- Historial
CREATE INDEX idx_order_history_date ON order_history(order_date DESC);
CREATE INDEX idx_order_history_waiter ON order_history(waiter_name);

-- Auditoría
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);