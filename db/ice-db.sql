-- ============================================
-- EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas fuzzy

-- ============================================
-- TIPOS ENUMERADOS
-- ============================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('ADMIN', 'CAJERO', 'MESERO', 'BARTENDER', 'COCINERO');

-- Estados de mesa
CREATE TYPE table_status AS ENUM ('LIBRE', 'OCUPADA', 'RESERVADA', 'LIMPIEZA');

-- Estados de orden
CREATE TYPE order_status AS ENUM (
    'PENDIENTE',
    'EN_PREPARACION', 
    'LISTO',
    'ENTREGADO',
    'PARCIALMENTE_PAGADO',
    'PAGADO',
    'CANCELADO'
);

-- Estados de items de orden
CREATE TYPE order_item_status AS ENUM (
    'PENDIENTE',
    'EN_PREPARACION',
    'LISTO',
    'ENTREGADO',
    'CANCELADO'
);

-- Métodos de pago
CREATE TYPE payment_method AS ENUM (
    'EFECTIVO',
    'TARJETA_VISA',
    'TARJETA_MASTERCARD',
    'TARJETA_AMEX',
    'YAPE',
    'PLIN',
    'TRANSFERENCIA',
    'MIXTO'
);

-- Tipos de comprobante
CREATE TYPE comprobante_type AS ENUM (
    'TICKET',      -- 00 - Nota de Venta (sin validez tributaria)
    'BOLETA',      -- 03 - Boleta Electrónica
    'FACTURA'      -- 01 - Factura Electrónica
);

-- Estado SUNAT
CREATE TYPE estado_sunat AS ENUM (
    'NO_APLICA',   -- Para tickets
    'PENDIENTE',
    'ENVIANDO',
    'ACEPTADO',
    'RECHAZADO',
    'OBSERVADO',
    'ANULADO'
);

-- Tipo documento identidad (catálogo SUNAT)
CREATE TYPE tipo_documento_identidad AS ENUM (
    'SIN_DOC',     -- 0 - Sin documento
    'DNI',         -- 1 - DNI
    'CARNET_EXT',  -- 4 - Carné de extranjería
    'RUC',         -- 6 - RUC
    'PASAPORTE'    -- 7 - Pasaporte
);

-- Áreas de impresión/preparación
CREATE TYPE area_preparacion AS ENUM (
    'COCINA',      -- Piso 1
    'CAJA',        -- Piso 1
    'BAR'          -- Piso 3
);

-- Estado de caja
CREATE TYPE cash_register_status AS ENUM ('ABIERTA', 'CERRADA');

-- Tipo de movimiento de caja
CREATE TYPE cash_movement_type AS ENUM ('INGRESO', 'EGRESO');

-- Tipos de nota crédito (catálogo SUNAT 09)
CREATE TYPE tipo_nota_credito AS ENUM (
    'ANULACION_OPERACION',      -- 01
    'ANULACION_ERROR_RUC',      -- 02
    'CORRECCION_DESCRIPCION',   -- 03
    'DESCUENTO_GLOBAL',         -- 04
    'DESCUENTO_ITEM',           -- 05
    'DEVOLUCION_TOTAL',         -- 06
    'DEVOLUCION_ITEM',          -- 07
    'BONIFICACION',             -- 08
    'DISMINUCION_VALOR',        -- 09
    'OTROS'                     -- 10
);

-- Tipos de nota débito (catálogo SUNAT 10)
CREATE TYPE tipo_nota_debito AS ENUM (
    'INTERES_MORA',    -- 01
    'AUMENTO_VALOR',   -- 02
    'PENALIDADES',     -- 03
    'OTROS'            -- 10
);

-- ============================================
-- CONFIGURACIÓN DEL SISTEMA
-- ============================================
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuraciones iniciales
INSERT INTO system_config (key, value, description) VALUES
    ('IGV_PERCENTAGE', '18', 'Porcentaje de IGV'),
    ('ICBPER_AMOUNT', '0.50', 'Monto ICBPER por bolsa plástica'),
    ('RESTAURANT_NAME', 'Mi Restaurante', 'Nombre del restaurante'),
    ('MAX_DINERS_PER_TABLE', '20', 'Máximo comensales por mesa'),
    ('AUTO_PRINT_KITCHEN', 'true', 'Imprimir automáticamente en cocina');

-- ============================================
-- EMPRESA (TU RESTAURANTE)
-- ============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Datos tributarios
    ruc VARCHAR(11) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    
    -- Dirección
    direccion VARCHAR(500) NOT NULL,
    ubigeo VARCHAR(6) NOT NULL,
    distrito VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    
    -- Contacto
    telefono VARCHAR(20),
    email VARCHAR(100),
    web VARCHAR(255),
    
    -- Configuración SUNAT (guardado seguro, idealmente encriptado)
    usuario_sol VARCHAR(50) NOT NULL,
    clave_sol VARCHAR(100) NOT NULL,
    
    -- Modo de operación
    modo_produccion BOOLEAN DEFAULT FALSE,
    
    -- Rutas en MinIO
    logo_path VARCHAR(500),
    certificado_path VARCHAR(500),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUCURSALES / LOCALES
-- ============================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    
    -- Dirección del local
    direccion VARCHAR(500) NOT NULL,
    ubigeo VARCHAR(6) NOT NULL,
    distrito VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, codigo)
);

-- ============================================
-- CORRELATIVOS POR SERIE
-- ============================================
CREATE TABLE correlatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    tipo_documento VARCHAR(2) NOT NULL, -- 01=Factura, 03=Boleta, 07=NC, 08=ND
    serie VARCHAR(4) NOT NULL,          -- F001, B001, FC01, etc.
    correlativo_actual INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(branch_id, tipo_documento, serie)
);

CREATE INDEX idx_correlatives_branch ON correlatives(branch_id, tipo_documento);

-- ============================================
-- PISOS DEL RESTAURANTE
-- ============================================
CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL,              -- 1, 2, 3
    description VARCHAR(255),
    
    -- Área de preparación por defecto para este piso
    default_area area_preparacion,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(branch_id, level)
);

-- ============================================
-- IMPRESORAS
-- ============================================
CREATE TABLE printers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
    
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,           -- 'TERMICA_58', 'TERMICA_80', 'LASER'
    connection_type VARCHAR(20) NOT NULL, -- 'USB', 'NETWORK', 'BLUETOOTH'
    address VARCHAR(255),                 -- IP o ruta USB
    
    -- Para qué área imprime
    area area_preparacion NOT NULL,
    
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USUARIOS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(255) NOT NULL,
    dni VARCHAR(8) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    role user_role DEFAULT 'MESERO',
    pin VARCHAR(6),                      -- PIN rápido para operaciones
    
    -- Seguridad
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relación usuarios-pisos (un mesero puede atender varios pisos)
CREATE TABLE user_floors (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, floor_id)
);

-- ============================================
-- CATEGORÍAS DE PRODUCTOS (con subcategorías)
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    
    -- Jerarquía
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,              -- 0=raíz, 1=hijo, 2=nieto...
    path TEXT,                            -- '/comidas/entradas/ceviches'
    
    -- Configuración
    area_preparacion area_preparacion DEFAULT 'COCINA',
    display_order INTEGER DEFAULT 0,
    
    -- Visual
    icon VARCHAR(50),
    color VARCHAR(7),                     -- Hex color
    image_path VARCHAR(500),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_path ON categories USING gin(path gin_trgm_ops);

-- ============================================
-- PRODUCTOS
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id),
    
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),              -- Para tickets de cocina
    description TEXT,
    
    -- Precios
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,        -- Costo (para reportes)
    
    -- Códigos SUNAT
    unidad_medida VARCHAR(3) DEFAULT 'NIU',  -- NIU=Unidad, ZZ=Servicio
    codigo_producto VARCHAR(30),              -- Código interno
    codigo_sunat VARCHAR(30),                 -- Si aplica catálogo SUNAT
    
    -- Impuestos
    afectacion_igv VARCHAR(2) DEFAULT '10',  -- 10=Gravado, 20=Exonerado, 30=Inafecto
    aplica_icbper BOOLEAN DEFAULT FALSE,      -- Para bolsas plásticas
    
    -- Área donde se prepara/imprime
    area_preparacion area_preparacion DEFAULT 'COCINA',
    
    -- Stock (opcional)
    is_stock_managed BOOLEAN DEFAULT FALSE,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    
    -- Visual
    image_path VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    
    -- Flags
    is_available BOOLEAN DEFAULT TRUE,       -- Disponible hoy
    is_active BOOLEAN DEFAULT TRUE,          -- Activo en sistema
    is_featured BOOLEAN DEFAULT FALSE,       -- Destacado
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_area ON products(area_preparacion);
CREATE INDEX idx_products_active ON products(is_active, is_available);

-- ============================================
-- VARIANTES DE PRODUCTO
-- ============================================
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,           -- "Extra grande", "Con queso", etc.
    price_modifier DECIMAL(10,2) DEFAULT 0, -- +5.00, -2.00, 0
    
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- ============================================
-- GRUPOS DE VARIANTES (Tamaño, Extras, etc.)
-- ============================================
CREATE TABLE variant_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,           -- "Tamaño", "Extras", "Término"
    is_required BOOLEAN DEFAULT FALSE,    -- Debe seleccionar al menos uno
    max_selections INTEGER DEFAULT 1,     -- Máximo seleccionable
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE variant_group_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_group_id UUID NOT NULL REFERENCES variant_groups(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) DEFAULT 0,
    
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MESAS
-- ============================================
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    
    number INTEGER NOT NULL,
    name VARCHAR(50),                     -- "Mesa 1", "VIP 1", "Barra 3"
    
    capacity INTEGER DEFAULT 4,
    status table_status DEFAULT 'LIBRE',
    
    -- Posición visual (para mapa de mesas)
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(floor_id, number)
);

CREATE INDEX idx_tables_floor_status ON tables(floor_id, status);

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    tipo_documento tipo_documento_identidad DEFAULT 'SIN_DOC',
    numero_documento VARCHAR(15) NOT NULL,
    
    razon_social VARCHAR(500) NOT NULL,
    nombre_comercial VARCHAR(255),
    
    -- Dirección (requerido para facturas)
    direccion VARCHAR(500),
    ubigeo VARCHAR(6),
    distrito VARCHAR(100),
    provincia VARCHAR(100),
    departamento VARCHAR(100),
    
    -- Contacto
    email VARCHAR(100),
    telefono VARCHAR(20),
    
    -- Estadísticas
    total_purchases DECIMAL(12,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tipo_documento, numero_documento)
);

CREATE INDEX idx_clients_documento ON clients(tipo_documento, numero_documento);
CREATE INDEX idx_clients_razon_social ON clients USING gin(razon_social gin_trgm_ops);

-- ============================================
-- ÓRDENES (COMANDAS)
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    daily_number INTEGER NOT NULL,        -- Número del día (reinicia cada día)
    order_date DATE DEFAULT CURRENT_DATE,
    
    -- Relaciones
    table_id UUID NOT NULL REFERENCES tables(id),
    user_id UUID NOT NULL REFERENCES users(id),  -- Mesero que creó
    
    -- Estado
    status order_status DEFAULT 'PENDIENTE',
    
    -- Comensales
    diners_count INTEGER DEFAULT 1,
    
    -- Notas generales
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(daily_number, order_date, table_id)
);

CREATE INDEX idx_orders_date ON orders(order_date, daily_number);
CREATE INDEX idx_orders_table ON orders(table_id, status);
CREATE INDEX idx_orders_user ON orders(user_id);

-- ============================================
-- ITEMS DE ORDEN
-- ============================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Cantidades y precios
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,    -- Precio al momento
    
    -- Variantes seleccionadas (JSON snapshot)
    variants_detail JSONB,
    variants_price DECIMAL(10,2) DEFAULT 0,
    
    -- Totales calculados
    subtotal DECIMAL(10,2) NOT NULL,      -- (unit_price + variants_price) * quantity
    
    -- Estado
    status order_item_status DEFAULT 'PENDIENTE',
    
    -- Área de preparación
    area_preparacion area_preparacion NOT NULL,
    
    -- Impresión
    is_printed BOOLEAN DEFAULT FALSE,
    printed_at TIMESTAMPTZ,
    
    -- Notas
    notes TEXT,
    
    -- Soft delete (para no afectar cálculos de items ya pagados)
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancel_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_status ON order_items(status, area_preparacion);
CREATE INDEX idx_order_items_print ON order_items(is_printed, area_preparacion) WHERE is_printed = FALSE;

-- ============================================
-- VENTAS / COMPROBANTES
-- ============================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación del comprobante
    tipo_comprobante comprobante_type NOT NULL,
    serie VARCHAR(4) NOT NULL,
    correlativo INTEGER NOT NULL,
    numero_completo VARCHAR(15) UNIQUE NOT NULL,  -- F001-00000001
    
    -- Fechas
    fecha_emision TIMESTAMPTZ DEFAULT NOW(),
    fecha_vencimiento TIMESTAMPTZ,
    
    -- Moneda
    tipo_moneda VARCHAR(3) DEFAULT 'PEN',
    
    -- Relaciones
    order_id UUID REFERENCES orders(id),
    client_id UUID REFERENCES clients(id),
    user_id UUID NOT NULL REFERENCES users(id),  -- Cajero
    
    -- Pago
    payment_method payment_method NOT NULL,
    forma_pago VARCHAR(20) DEFAULT 'Contado',
    
    -- Montos (base imponible)
    monto_gravado DECIMAL(12,2) DEFAULT 0,
    monto_exonerado DECIMAL(12,2) DEFAULT 0,
    monto_inafecto DECIMAL(12,2) DEFAULT 0,
    monto_gratuito DECIMAL(12,2) DEFAULT 0,
    
    -- Impuestos
    monto_igv DECIMAL(12,2) DEFAULT 0,
    monto_icbper DECIMAL(12,2) DEFAULT 0,
    total_impuestos DECIMAL(12,2) DEFAULT 0,
    
    -- Totales
    valor_venta DECIMAL(12,2) DEFAULT 0,      -- Sin IGV
    precio_venta_total DECIMAL(12,2) NOT NULL, -- Total a pagar
    
    -- Pago
    monto_pagado DECIMAL(12,2),
    vuelto DECIMAL(12,2),
    
    -- Snapshot de items (para historial)
    items_snapshot JSONB NOT NULL,
    monto_letras VARCHAR(500),
    
    -- Estado SUNAT
    estado_sunat estado_sunat DEFAULT 'NO_APLICA',
    
    -- Archivos en MinIO
    xml_path VARCHAR(500),
    pdf_path VARCHAR(500),
    cdr_path VARCHAR(500),
    
    -- Respuesta SUNAT
    sunat_hash VARCHAR(100),
    sunat_code VARCHAR(10),
    sunat_description TEXT,
    sunat_notes TEXT,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_fecha ON sales(fecha_emision);
CREATE INDEX idx_sales_numero ON sales(numero_completo);
CREATE INDEX idx_sales_order ON sales(order_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_estado ON sales(estado_sunat);

-- ============================================
-- ITEMS DE VENTA (detalle del comprobante)
-- ============================================
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Datos al momento de la venta
    codigo_producto VARCHAR(30),
    descripcion VARCHAR(500) NOT NULL,
    unidad_medida VARCHAR(3) NOT NULL,
    
    -- Cantidades
    cantidad DECIMAL(12,3) NOT NULL,
    
    -- Precios
    mto_valor_unitario DECIMAL(12,10) NOT NULL,  -- Sin IGV
    mto_precio_unitario DECIMAL(12,10) NOT NULL, -- Con IGV
    mto_valor_venta DECIMAL(12,2) NOT NULL,      -- cantidad * valor_unitario
    
    -- Impuestos
    afectacion_igv VARCHAR(2) NOT NULL,          -- 10, 20, 30
    porcentaje_igv DECIMAL(5,2) DEFAULT 18.00,
    mto_base_igv DECIMAL(12,2) DEFAULT 0,
    mto_igv DECIMAL(12,2) DEFAULT 0,
    mto_icbper DECIMAL(12,2) DEFAULT 0,
    total_impuestos DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ============================================
-- PAGOS PARCIALES (para pagos separados)
-- ============================================
CREATE TABLE partial_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id),
    
    -- Items que cubre este pago
    items_covered JSONB NOT NULL,         -- [{order_item_id, quantity}]
    
    -- Monto
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    
    -- Quién pagó
    payer_name VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partial_payments_order ON partial_payments(order_id);

-- ============================================
-- NOTAS DE CRÉDITO
-- ============================================
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Identificación
    serie VARCHAR(4) NOT NULL,
    correlativo VARCHAR(8) NOT NULL,
    numero_completo VARCHAR(15) UNIQUE NOT NULL,
    
    fecha_emision TIMESTAMPTZ DEFAULT NOW(),
    
    -- Documento de referencia
    sale_id UUID REFERENCES sales(id),
    tipo_doc_ref VARCHAR(2) NOT NULL,     -- 01 o 03
    serie_ref VARCHAR(4) NOT NULL,
    correlativo_ref VARCHAR(8) NOT NULL,
    
    -- Tipo y motivo
    tipo_nota tipo_nota_credito NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    
    -- Montos
    valor_venta DECIMAL(12,2) DEFAULT 0,
    monto_igv DECIMAL(12,2) DEFAULT 0,
    total_impuestos DECIMAL(12,2) DEFAULT 0,
    mto_imp_venta DECIMAL(12,2) NOT NULL,
    
    -- Archivos
    xml_path VARCHAR(500),
    pdf_path VARCHAR(500),
    cdr_path VARCHAR(500),
    
    -- Estado
    estado_sunat estado_sunat DEFAULT 'PENDIENTE',
    sunat_hash VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_notes_sale ON credit_notes(sale_id);
CREATE INDEX idx_credit_notes_fecha ON credit_notes(fecha_emision);

-- ============================================
-- ITEMS DE NOTA DE CRÉDITO
-- ============================================
CREATE TABLE credit_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
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

-- ============================================
-- NOTAS DE DÉBITO
-- ============================================
CREATE TABLE debit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
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
    
    tipo_nota tipo_nota_debito NOT NULL,
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

-- ============================================
-- RESÚMENES DIARIOS (para boletas)
-- ============================================
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    identificador VARCHAR(20) UNIQUE NOT NULL,  -- RC-20241228-001
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_referencia DATE NOT NULL,
    
    -- Boletas incluidas
    sales_ids UUID[] NOT NULL,
    sales_count INTEGER NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    
    -- Archivos
    xml_path VARCHAR(500),
    cdr_path VARCHAR(500),
    
    -- Estado
    estado_sunat estado_sunat DEFAULT 'PENDIENTE',
    ticket_sunat VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_summaries_fecha ON daily_summaries(fecha_referencia);

-- ============================================
-- COMUNICACIÓN DE BAJA (anulaciones)
-- ============================================
CREATE TABLE voided_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    identificador VARCHAR(20) UNIQUE NOT NULL,  -- RA-20241228-001
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_referencia DATE NOT NULL,
    
    -- Documento anulado
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

-- ============================================
-- CAJA REGISTRADORA
-- ============================================
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    
    -- Tiempos
    open_time TIMESTAMPTZ DEFAULT NOW(),
    close_time TIMESTAMPTZ,
    
    -- Montos
    initial_amount DECIMAL(12,2) NOT NULL,
    system_amount DECIMAL(12,2),          -- Calculado por sistema
    final_amount DECIMAL(12,2),           -- Contado por cajero
    difference DECIMAL(12,2),             -- final - system
    
    status cash_register_status DEFAULT 'ABIERTA',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_registers_user ON cash_registers(user_id, status);
CREATE INDEX idx_cash_registers_open ON cash_registers(open_time);

-- ============================================
-- MOVIMIENTOS DE CAJA
-- ============================================
CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    
    type cash_movement_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    
    -- Si es automático (venta) o manual
    is_automatic BOOLEAN DEFAULT FALSE,
    sale_id UUID REFERENCES sales(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_movements_register ON cash_movements(cash_register_id);

-- ============================================
-- RESERVACIONES
-- ============================================
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

CREATE INDEX idx_reservations_date ON reservations(reservation_date, reservation_time);
CREATE INDEX idx_reservations_table ON reservations(table_id);

-- ============================================
-- AUDITORÍA
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,          -- CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type VARCHAR(50) NOT NULL,     -- orders, sales, products...
    entity_id UUID,
    
    old_values JSONB,
    new_values JSONB,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- ============================================
-- UBIGEO PERÚ (para autocompletado)
-- ============================================
CREATE TABLE ubigeo_regiones (
    codigo VARCHAR(2) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE ubigeo_provincias (
    codigo VARCHAR(4) PRIMARY KEY,
    region_codigo VARCHAR(2) NOT NULL REFERENCES ubigeo_regiones(codigo),
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE ubigeo_distritos (
    codigo VARCHAR(6) PRIMARY KEY,
    provincia_codigo VARCHAR(4) NOT NULL REFERENCES ubigeo_provincias(codigo),
    nombre VARCHAR(100) NOT NULL
);

CREATE INDEX idx_ubigeo_prov_region ON ubigeo_provincias(region_codigo);
CREATE INDEX idx_ubigeo_dist_prov ON ubigeo_distritos(provincia_codigo);

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función para obtener siguiente correlativo
CREATE OR REPLACE FUNCTION get_next_correlativo(
    p_branch_id UUID,
    p_tipo_documento VARCHAR(2),
    p_serie VARCHAR(4)
) RETURNS INTEGER AS $$
DECLARE
    v_correlativo INTEGER;
BEGIN
    UPDATE correlatives
    SET correlativo_actual = correlativo_actual + 1,
        updated_at = NOW()
    WHERE branch_id = p_branch_id
      AND tipo_documento = p_tipo_documento
      AND serie = p_serie
    RETURNING correlativo_actual INTO v_correlativo;
    
    IF v_correlativo IS NULL THEN
        INSERT INTO correlatives (branch_id, tipo_documento, serie, correlativo_actual)
        VALUES (p_branch_id, p_tipo_documento, p_serie, 1)
        RETURNING correlativo_actual INTO v_correlativo;
    END IF;
    
    RETURN v_correlativo;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular IGV
CREATE OR REPLACE FUNCTION calculate_igv(
    p_base_amount DECIMAL(12,2),
    p_igv_rate DECIMAL(5,2) DEFAULT 18.00
) RETURNS DECIMAL(12,2) AS $$
BEGIN
    RETURN ROUND(p_base_amount * (p_igv_rate / 100), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para extraer base imponible de un monto con IGV
CREATE OR REPLACE FUNCTION extract_base_from_total(
    p_total DECIMAL(12,2),
    p_igv_rate DECIMAL(5,2) DEFAULT 18.00
) RETURNS DECIMAL(12,2) AS $$
BEGIN
    RETURN ROUND(p_total / (1 + (p_igv_rate / 100)), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================
-- DATOS INICIALES EJEMPLO
-- ============================================

-- Crear empresa ejemplo
INSERT INTO companies (ruc, razon_social, nombre_comercial, direccion, ubigeo, distrito, provincia, departamento, usuario_sol, clave_sol)
VALUES ('20161515648', 'MI RESTAURANTE S.A.C.', 'El Buen Sabor', 'Av. Principal 123', '150101', 'Lima', 'Lima', 'Lima', '20161515648MODDATOS', 'MODDATOS');

-- Crear sucursal
INSERT INTO branches (company_id, codigo, nombre, direccion, ubigeo, distrito, provincia, departamento)
SELECT id, '001', 'Local Principal', 'Av. Principal 123', '150101', 'Lima', 'Lima', 'Lima'
FROM companies WHERE ruc = '20161515648';

-- Crear pisos
INSERT INTO floors (branch_id, name, level, default_area, description)
SELECT b.id, 'Primer Piso', 1, 'COCINA', 'Cocina y Caja'
FROM branches b WHERE codigo = '001'
UNION ALL
SELECT b.id, 'Segundo Piso', 2, 'COCINA', 'Área de mesas'
FROM branches b WHERE codigo = '001'
UNION ALL
SELECT b.id, 'Tercer Piso', 3, 'BAR', 'Bar y Bebidas'
FROM branches b WHERE codigo = '001';

-- Crear correlativos
INSERT INTO correlatives (branch_id, tipo_documento, serie, correlativo_actual)
SELECT b.id, '01', 'F001', 0 FROM branches b WHERE codigo = '001'
UNION ALL
SELECT b.id, '03', 'B001', 0 FROM branches b WHERE codigo = '001'
UNION ALL
SELECT b.id, '07', 'FC01', 0 FROM branches b WHERE codigo = '001'
UNION ALL
SELECT b.id, '07', 'BC01', 0 FROM branches b WHERE codigo = '001'
UNION ALL
SELECT b.id, '08', 'FD01', 0 FROM branches b WHERE codigo = '001';

-- Crear usuario admin
INSERT INTO users (name, dni, username, password_hash, role)
VALUES ('Administrador', '12345678', 'admin', '$2b$10$example_hash', 'ADMIN');

-- Crear categorías
INSERT INTO categories (name, slug, area_preparacion, display_order) VALUES
    ('Entradas', 'entradas', 'COCINA', 1),
    ('Platos de Fondo', 'platos-fondo', 'COCINA', 2),
    ('Bebidas', 'bebidas', 'BAR', 3),
    ('Cocteles', 'cocteles', 'BAR', 4),
    ('Postres', 'postres', 'COCINA', 5);

-- Insertar subcategorías
INSERT INTO categories (name, slug, parent_id, level, area_preparacion, display_order)
SELECT 'Ceviches', 'ceviches', id, 1, 'COCINA', 1 FROM categories WHERE slug = 'entradas'
UNION ALL
SELECT 'Tiraditos', 'tiraditos', id, 1, 'COCINA', 2 FROM categories WHERE slug = 'entradas'
UNION ALL
SELECT 'Carnes', 'carnes', id, 1, 'COCINA', 1 FROM categories WHERE slug = 'platos-fondo'
UNION ALL
SELECT 'Pescados', 'pescados', id, 1, 'COCINA', 2 FROM categories WHERE slug = 'platos-fondo'
UNION ALL
SELECT 'Gaseosas', 'gaseosas', id, 1, 'BAR', 1 FROM categories WHERE slug = 'bebidas'
UNION ALL
SELECT 'Jugos', 'jugos', id, 1, 'BAR', 2 FROM categories WHERE slug = 'bebidas'
UNION ALL
SELECT 'Cervezas', 'cervezas', id, 1, 'BAR', 3 FROM categories WHERE slug = 'bebidas';

-- Cliente genérico
INSERT INTO clients (tipo_documento, numero_documento, razon_social)
VALUES ('SIN_DOC', '00000000', 'CLIENTE VARIOS');
