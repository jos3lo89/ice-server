-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'CAJERO', 'MESERO', 'BARTENDER', 'COCINERO');

-- CreateEnum
CREATE TYPE "table_status" AS ENUM ('LIBRE', 'OCUPADA', 'RESERVADA', 'LIMPIEZA');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('ABIERTA', 'CERRADA', 'PARCIALMENTE_PAGADA', 'PAGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "order_item_status" AS ENUM ('PENDIENTE', 'ENVIADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('EFECTIVO', 'TARJETA_VISA', 'TARJETA_MASTERCARD', 'TARJETA_AMEX', 'YAPE', 'PLIN', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "comprobante_type" AS ENUM ('TICKET', 'BOLETA', 'FACTURA');

-- CreateEnum
CREATE TYPE "estado_sunat" AS ENUM ('NO_APLICA', 'PENDIENTE', 'ENVIANDO', 'ACEPTADO', 'RECHAZADO', 'OBSERVADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "tipo_documento_identidad" AS ENUM ('SIN_DOC', 'DNI', 'CARNET_EXT', 'RUC', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "area_preparacion" AS ENUM ('COCINA', 'BAR', 'BEBIDAS', 'CAJA');

-- CreateEnum
CREATE TYPE "cash_register_status" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "cash_movement_type" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "tipo_nota_credito" AS ENUM ('ANULACION_OPERACION', 'ANULACION_ERROR_RUC', 'CORRECCION_DESCRIPCION', 'DESCUENTO_GLOBAL', 'DESCUENTO_ITEM', 'DEVOLUCION_TOTAL', 'DEVOLUCION_ITEM', 'BONIFICACION', 'DISMINUCION_VALOR', 'OTROS');

-- CreateTable
CREATE TABLE "system_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "correlatives" (
    "id" UUID NOT NULL,
    "tipo_documento" VARCHAR(2) NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo_actual" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correlatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "level" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "connection_type" VARCHAR(20) NOT NULL,
    "address" VARCHAR(255),
    "area" "area_preparacion" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "dni" VARCHAR(8) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'MESERO',
    "pin" VARCHAR(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "last_login_ip" VARCHAR(45),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_floors" (
    "user_id" UUID NOT NULL,
    "floor_id" UUID NOT NULL,

    CONSTRAINT "user_floors_pkey" PRIMARY KEY ("user_id","floor_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "parent_id" UUID,
    "level" INTEGER NOT NULL DEFAULT 0,
    "default_area" "area_preparacion" NOT NULL DEFAULT 'COCINA',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "image_path" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(50),
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unidad_medida" VARCHAR(3) NOT NULL DEFAULT 'NIU',
    "codigo_producto" VARCHAR(30),
    "afectacion_igv" VARCHAR(2) NOT NULL DEFAULT '10',
    "aplica_icbper" BOOLEAN NOT NULL DEFAULT false,
    "area_preparacion" "area_preparacion" NOT NULL,
    "is_stock_managed" BOOLEAN NOT NULL DEFAULT false,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "image_path" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_groups" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "max_selections" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_options" (
    "id" UUID NOT NULL,
    "variant_group_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price_modifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL,
    "floor_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" VARCHAR(50),
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "table_status" NOT NULL DEFAULT 'LIBRE',
    "pos_x" INTEGER NOT NULL DEFAULT 0,
    "pos_y" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "tipo_documento" "tipo_documento_identidad" NOT NULL DEFAULT 'SIN_DOC',
    "numero_documento" VARCHAR(15) NOT NULL,
    "razon_social" VARCHAR(500) NOT NULL,
    "nombre_comercial" VARCHAR(255),
    "direccion" VARCHAR(500),
    "ubigeo" VARCHAR(6),
    "email" VARCHAR(100),
    "telefono" VARCHAR(20),
    "total_purchases" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "last_visit_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "daily_number" INTEGER NOT NULL,
    "order_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "table_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'ABIERTA',
    "diners_count" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cancelled" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_pending" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_split_payment" BOOLEAN NOT NULL DEFAULT false,
    "split_payment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "product_short_name" VARCHAR(50),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "variants_snapshot" JSONB,
    "variants_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(10,2) NOT NULL,
    "status" "order_item_status" NOT NULL DEFAULT 'PENDIENTE',
    "area_preparacion" "area_preparacion" NOT NULL,
    "sent_to_kitchen_at" TIMESTAMPTZ(6),
    "printed_at" TIMESTAMPTZ(6),
    "printer_id" UUID,
    "notes" TEXT,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" UUID,
    "cancel_reason" TEXT,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "payment_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "open_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "close_time" TIMESTAMPTZ(6),
    "initial_amount" DECIMAL(12,2) NOT NULL,
    "total_sales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_income" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_expense" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expected_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "status" "cash_register_status" NOT NULL DEFAULT 'ABIERTA',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "cash_register_id" UUID NOT NULL,
    "type" "cash_movement_type" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,
    "payment_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "cash_register_id" UUID NOT NULL,
    "payment_number" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "amount_received" DECIMAL(12,2),
    "change_given" DECIMAL(12,2),
    "payer_name" VARCHAR(255),
    "payer_notes" TEXT,
    "sale_id" UUID,
    "processed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_items" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity_paid" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "tipo_comprobante" "comprobante_type" NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "numero_completo" VARCHAR(15) NOT NULL,
    "fecha_emision" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMPTZ(6),
    "tipo_moneda" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "order_id" UUID,
    "payment_id" UUID,
    "client_id" UUID,
    "user_id" UUID NOT NULL,
    "cash_register_id" UUID,
    "payment_method" "payment_method" NOT NULL,
    "forma_pago" VARCHAR(20) NOT NULL DEFAULT 'Contado',
    "monto_gravado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_exonerado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_inafecto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_gratuito" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_igv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_icbper" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_impuestos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valor_venta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precio_venta_total" DECIMAL(12,2) NOT NULL,
    "monto_pagado" DECIMAL(12,2),
    "vuelto" DECIMAL(12,2),
    "monto_letras" VARCHAR(500),
    "estado_sunat" "estado_sunat" NOT NULL DEFAULT 'NO_APLICA',
    "xml_path" VARCHAR(500),
    "pdf_path" VARCHAR(500),
    "cdr_path" VARCHAR(500),
    "sunat_hash" VARCHAR(100),
    "sunat_code" VARCHAR(10),
    "sunat_description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "order_item_id" UUID,
    "product_id" UUID,
    "codigo_producto" VARCHAR(30),
    "descripcion" VARCHAR(500) NOT NULL,
    "unidad_medida" VARCHAR(3) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "mto_valor_unitario" DECIMAL(12,10) NOT NULL,
    "mto_precio_unitario" DECIMAL(12,10) NOT NULL,
    "mto_valor_venta" DECIMAL(12,2) NOT NULL,
    "afectacion_igv" VARCHAR(2) NOT NULL,
    "porcentaje_igv" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "mto_base_igv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mto_igv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mto_icbper" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_impuestos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variantes_descripcion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo" VARCHAR(8) NOT NULL,
    "numero_completo" VARCHAR(15) NOT NULL,
    "fecha_emision" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id" UUID,
    "tipo_doc_ref" VARCHAR(2) NOT NULL,
    "serie_ref" VARCHAR(4) NOT NULL,
    "correlativo_ref" VARCHAR(8) NOT NULL,
    "tipo_nota" "tipo_nota_credito" NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "valor_venta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monto_igv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_impuestos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mto_imp_venta" DECIMAL(12,2) NOT NULL,
    "xml_path" VARCHAR(500),
    "pdf_path" VARCHAR(500),
    "cdr_path" VARCHAR(500),
    "estado_sunat" "estado_sunat" NOT NULL DEFAULT 'PENDIENTE',
    "sunat_hash" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_items" (
    "id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "product_id" UUID,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "unidad_medida" VARCHAR(3) NOT NULL,
    "descripcion" VARCHAR(500) NOT NULL,
    "mto_valor_unitario" DECIMAL(12,10) NOT NULL,
    "mto_precio_unitario" DECIMAL(12,10) NOT NULL,
    "mto_valor_venta" DECIMAL(12,2) NOT NULL,
    "afectacion_igv" VARCHAR(2) NOT NULL,
    "mto_igv" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_impuestos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" UUID NOT NULL,
    "identificador" VARCHAR(20) NOT NULL,
    "fecha_emision" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_referencia" DATE NOT NULL,
    "sales_ids" UUID[],
    "sales_count" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "xml_path" VARCHAR(500),
    "cdr_path" VARCHAR(500),
    "estado_sunat" "estado_sunat" NOT NULL DEFAULT 'PENDIENTE',
    "ticket_sunat" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voided_documents" (
    "id" UUID NOT NULL,
    "identificador" VARCHAR(20) NOT NULL,
    "fecha_emision" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_referencia" DATE NOT NULL,
    "sale_id" UUID,
    "tipo_documento" VARCHAR(2) NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo" VARCHAR(8) NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "xml_path" VARCHAR(500),
    "cdr_path" VARCHAR(500),
    "estado_sunat" "estado_sunat" NOT NULL DEFAULT 'PENDIENTE',
    "ticket_sunat" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voided_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "client_phone" VARCHAR(20),
    "client_email" VARCHAR(100),
    "reservation_date" DATE NOT NULL,
    "reservation_time" TIME(6) NOT NULL,
    "duration_hours" DECIMAL(3,1) NOT NULL DEFAULT 2,
    "diners_count" INTEGER NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_daily_number" INTEGER NOT NULL,
    "order_date" DATE NOT NULL,
    "table_number" INTEGER NOT NULL,
    "floor_name" VARCHAR(100) NOT NULL,
    "waiter_name" VARCHAR(255) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "total_items" INTEGER NOT NULL,
    "was_split_payment" BOOLEAN NOT NULL DEFAULT false,
    "payment_count" INTEGER NOT NULL DEFAULT 1,
    "sales_generated" JSONB,
    "opened_at" TIMESTAMPTZ(6) NOT NULL,
    "closed_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "correlatives_tipo_documento_serie_key" ON "correlatives"("tipo_documento", "serie");

-- CreateIndex
CREATE UNIQUE INDEX "floors_level_key" ON "floors"("level");

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_categories_parent" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_categories_slug" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "idx_products_area" ON "products"("area_preparacion");

-- CreateIndex
CREATE INDEX "idx_products_active" ON "products"("is_active", "is_available");

-- CreateIndex
CREATE INDEX "idx_variant_groups_product" ON "variant_groups"("product_id");

-- CreateIndex
CREATE INDEX "idx_variant_options_group" ON "variant_options"("variant_group_id");

-- CreateIndex
CREATE INDEX "idx_tables_floor_status" ON "tables"("floor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_floor_id_number_key" ON "tables"("floor_id", "number");

-- CreateIndex
CREATE INDEX "idx_clients_documento" ON "clients"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "clients_tipo_documento_numero_documento_key" ON "clients"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE INDEX "idx_orders_date" ON "orders"("order_date", "daily_number");

-- CreateIndex
CREATE INDEX "idx_orders_table" ON "orders"("table_id", "status");

-- CreateIndex
CREATE INDEX "idx_orders_user" ON "orders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_daily_number_order_date_key" ON "orders"("daily_number", "order_date");

-- CreateIndex
CREATE INDEX "idx_order_items_order" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_items_status" ON "order_items"("status", "area_preparacion");

-- CreateIndex
CREATE INDEX "idx_order_items_product" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_cash_registers_status" ON "cash_registers"("status");

-- CreateIndex
CREATE INDEX "idx_cash_registers_user" ON "cash_registers"("user_id");

-- CreateIndex
CREATE INDEX "idx_cash_movements_register" ON "cash_movements"("cash_register_id");

-- CreateIndex
CREATE INDEX "idx_payments_order" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "idx_payments_cash_register" ON "payments"("cash_register_id");

-- CreateIndex
CREATE INDEX "idx_payment_items_payment" ON "payment_items"("payment_id");

-- CreateIndex
CREATE INDEX "idx_payment_items_order_item" ON "payment_items"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_items_payment_id_order_item_id_key" ON "payment_items"("payment_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_numero_completo_key" ON "sales"("numero_completo");

-- CreateIndex
CREATE UNIQUE INDEX "sales_payment_id_key" ON "sales"("payment_id");

-- CreateIndex
CREATE INDEX "idx_sales_fecha" ON "sales"("fecha_emision");

-- CreateIndex
CREATE INDEX "idx_sales_numero" ON "sales"("numero_completo");

-- CreateIndex
CREATE INDEX "idx_sales_order" ON "sales"("order_id");

-- CreateIndex
CREATE INDEX "idx_sales_payment" ON "sales"("payment_id");

-- CreateIndex
CREATE INDEX "idx_sales_client" ON "sales"("client_id");

-- CreateIndex
CREATE INDEX "idx_sale_items_sale" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "idx_sale_items_product" ON "sale_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_numero_completo_key" ON "credit_notes"("numero_completo");

-- CreateIndex
CREATE INDEX "idx_credit_notes_sale" ON "credit_notes"("sale_id");

-- CreateIndex
CREATE INDEX "idx_credit_notes_fecha" ON "credit_notes"("fecha_emision");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_identificador_key" ON "daily_summaries"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "voided_documents_identificador_key" ON "voided_documents"("identificador");

-- CreateIndex
CREATE INDEX "idx_reservations_date" ON "reservations"("reservation_date", "reservation_time");

-- CreateIndex
CREATE INDEX "idx_reservations_table" ON "reservations"("table_id");

-- CreateIndex
CREATE INDEX "idx_order_history_date" ON "order_history"("order_date");

-- CreateIndex
CREATE INDEX "idx_order_history_waiter" ON "order_history"("waiter_name");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_date" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "user_floors" ADD CONSTRAINT "user_floors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_floors" ADD CONSTRAINT "user_floors_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_groups" ADD CONSTRAINT "variant_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_options" ADD CONSTRAINT "variant_options_variant_group_id_fkey" FOREIGN KEY ("variant_group_id") REFERENCES "variant_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voided_documents" ADD CONSTRAINT "voided_documents_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
