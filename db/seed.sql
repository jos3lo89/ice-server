-- ============================================
-- ICE MANKORA - DATOS INICIALES (SEED)
-- ============================================


-- ============================================
-- 1. CONFIGURACIÓN DEL SISTEMA
-- ============================================
INSERT INTO system_config (key, value, description) VALUES
    ('IGV_PERCENTAGE', '18', 'Porcentaje de IGV'),
    ('ICBPER_AMOUNT', '0.50', 'Monto ICBPER por bolsa plástica'),
    ('RESTAURANT_NAME', 'ICE MANKORA', 'Nombre del restaurante'),
    ('RESTAURANT_RUC', '20161515648', 'RUC del restaurante'),
    ('RESTAURANT_RAZON_SOCIAL', 'ICE MANKORA S.A.C.', 'Razón social'),
    ('RESTAURANT_NOMBRE_COMERCIAL', 'ICE MANKORA', 'Nombre comercial'),
    ('RESTAURANT_DIRECCION', 'Av. Principal 123, Miraflores', 'Dirección fiscal'),
    ('RESTAURANT_UBIGEO', '150122', 'Código ubigeo (Miraflores)'),
    ('RESTAURANT_DISTRITO', 'Miraflores', 'Distrito'),
    ('RESTAURANT_PROVINCIA', 'Lima', 'Provincia'),
    ('RESTAURANT_DEPARTAMENTO', 'Lima', 'Departamento'),
    ('RESTAURANT_TELEFONO', '01-1234567', 'Teléfono'),
    ('RESTAURANT_EMAIL', 'contacto@icemankora.com', 'Email de contacto'),
    ('MAX_DINERS_PER_TABLE', '20', 'Máximo comensales por mesa'),
    ('DEFAULT_TIP_PERCENTAGE', '10', 'Porcentaje de propina sugerida'),
    ('USUARIO_SOL', '20161515648MODDATOS', 'Usuario SOL para SUNAT'),
    ('CLAVE_SOL', 'MODDATOS', 'Clave SOL (encriptar en producción)'),
    ('MODO_PRODUCCION', 'false', 'true=Producción SUNAT, false=Beta'),
    ('AUTO_PRINT_KITCHEN', 'true', 'Imprimir automáticamente en cocina'),
    ('KITCHEN_PRINT_DELAY_SECONDS', '0', 'Segundos de espera antes de imprimir'),
    ('CURRENCY_SYMBOL', 'S/', 'Símbolo de moneda'),
    ('CURRENCY_CODE', 'PEN', 'Código de moneda ISO');


-- ============================================
-- 2. CORRELATIVOS DE COMPROBANTES
-- ============================================
INSERT INTO correlatives (tipo_documento, serie, correlativo_actual) VALUES
    ('00', 'T001', 0),   -- Tickets (sin validez tributaria)
    ('01', 'F001', 0),   -- Facturas electrónicas
    ('03', 'B001', 0),   -- Boletas electrónicas
    ('07', 'FC01', 0),   -- Notas de crédito (facturas)
    ('07', 'BC01', 0),   -- Notas de crédito (boletas)
    ('08', 'FD01', 0),   -- Notas de débito (facturas)
    ('08', 'BD01', 0);   -- Notas de débito (boletas)


-- ============================================
-- 3. PISOS DEL RESTAURANTE
-- ============================================
INSERT INTO floors (name, level, description, is_active) VALUES
    ('Primer Piso', 1, 'Área principal - Cocina, Caja y Mesas', TRUE),
    ('Segundo Piso', 2, 'Área de mesas', TRUE),
    ('Tercer Piso', 3, 'Área de bebidas', TRUE);


-- ============================================
-- 4. IMPRESORAS
-- ============================================
INSERT INTO printers (name, type, connection_type, address, area, is_default, is_active) VALUES
    ('Impresora Cocina', 'TERMICA_80', 'NETWORK', '192.168.1.100', 'COCINA', TRUE, TRUE),
    ('Impresora Bar', 'TERMICA_58', 'NETWORK', '192.168.1.101', 'BAR', TRUE, TRUE),
    ('Impresora Bebidas', 'TERMICA_58', 'NETWORK', '192.168.1.102', 'BEBIDAS', TRUE, TRUE),
    ('Impresora Caja Principal', 'TERMICA_80', 'USB', '/dev/usb/lp0', 'CAJA', TRUE, TRUE);


-- ============================================
-- 5. USUARIO ADMINISTRADOR
-- ============================================
-- Contraseña por defecto: admin123 
-- Hash generado con bcrypt rounds=10
INSERT INTO users (name, dni, username, password_hash, role, pin, is_active) VALUES
    ('Administrador', '00000000', 'admin', '$2b$10$rQZQzRHKXZUvvdYdUWXkxOqxKrZ8QJXZQZ8QJXZQZ8QJXZQZ8QJX', 'ADMIN', '123456', TRUE);


-- ============================================
-- 6. CLIENTE GENÉRICO (VENTAS SIN DOCUMENTO)
-- ============================================
INSERT INTO clients (tipo_documento, numero_documento, razon_social, is_active) VALUES
    ('SIN_DOC', '00000000', 'CLIENTE VARIOS', TRUE);


-- ============================================
-- 7. CATEGORÍAS PRINCIPALES
-- ============================================
INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, color, is_active) VALUES
    ('Entradas', 'entradas', 'Entradas y aperitivos', NULL, 0, 'COCINA', 1, '#FF6B6B', TRUE),
    ('Platos de Fondo', 'platos-fondo', 'Platos principales', NULL, 0, 'COCINA', 2, '#4ECDC4', TRUE),
    ('Sopas y Caldos', 'sopas-caldos', 'Sopas, caldos y cremas', NULL, 0, 'COCINA', 3, '#FFE66D', TRUE),
    ('Bebidas', 'bebidas', 'Bebidas sin alcohol', NULL, 0, 'BEBIDAS', 4, '#95E1D3', TRUE),
    ('Cocteles', 'cocteles', 'Cocteles y tragos preparados', NULL, 0, 'BAR', 5, '#F38181', TRUE),
    ('Cervezas', 'cervezas', 'Cervezas nacionales e importadas', NULL, 0, 'BAR', 6, '#FCE38A', TRUE),
    ('Vinos y Licores', 'vinos-licores', 'Vinos, piscos y licores', NULL, 0, 'BAR', 7, '#AA96DA', TRUE),
    ('Postres', 'postres', 'Postres y dulces', NULL, 0, 'COCINA', 8, '#FFAAA5', TRUE),
    ('Para Compartir', 'para-compartir', 'Piqueos y platos para compartir', NULL, 0, 'COCINA', 9, '#A8D8EA', TRUE);


-- ============================================
-- 8. SUBCATEGORÍAS
-- ============================================

-- Subcategorías de Entradas
INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Ceviches', 'ceviches', 'Ceviches y tiraditos', id, 1, 'COCINA', 1, TRUE
FROM categories WHERE slug = 'entradas';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Tiraditos', 'tiraditos', 'Tiraditos variados', id, 1, 'COCINA', 2, TRUE
FROM categories WHERE slug = 'entradas';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Causas', 'causas', 'Causas rellenas', id, 1, 'COCINA', 3, TRUE
FROM categories WHERE slug = 'entradas';

-- Subcategorías de Platos de Fondo
INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Carnes', 'carnes', 'Platos con carne de res', id, 1, 'COCINA', 1, TRUE
FROM categories WHERE slug = 'platos-fondo';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Pollo', 'pollo', 'Platos con pollo', id, 1, 'COCINA', 2, TRUE
FROM categories WHERE slug = 'platos-fondo';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Pescados y Mariscos', 'pescados-mariscos', 'Platos marinos', id, 1, 'COCINA', 3, TRUE
FROM categories WHERE slug = 'platos-fondo';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Arroces', 'arroces', 'Arroces y risottos', id, 1, 'COCINA', 4, TRUE
FROM categories WHERE slug = 'platos-fondo';

-- Subcategorías de Bebidas
INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Gaseosas', 'gaseosas', 'Gaseosas y sodas', id, 1, 'BEBIDAS', 1, TRUE
FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Jugos Naturales', 'jugos-naturales', 'Jugos de frutas naturales', id, 1, 'BEBIDAS', 2, TRUE
FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Aguas', 'aguas', 'Aguas minerales y de mesa', id, 1, 'BEBIDAS', 3, TRUE
FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Infusiones', 'infusiones', 'Tés, cafés e infusiones', id, 1, 'BEBIDAS', 4, TRUE
FROM categories WHERE slug = 'bebidas';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Chicha y Refrescos', 'chicha-refrescos', 'Chicha morada y refrescos', id, 1, 'BEBIDAS', 5, TRUE
FROM categories WHERE slug = 'bebidas';

-- Subcategorías de Cocteles
INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Pisco Sour', 'pisco-sour', 'Variedades de pisco sour', id, 1, 'BAR', 1, TRUE
FROM categories WHERE slug = 'cocteles';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Chilcanos', 'chilcanos', 'Chilcanos variados', id, 1, 'BAR', 2, TRUE
FROM categories WHERE slug = 'cocteles';

INSERT INTO categories (name, slug, description, parent_id, level, default_area, display_order, is_active)
SELECT 'Cocteles Clásicos', 'cocteles-clasicos', 'Mojitos, margaritas y más', id, 1, 'BAR', 3, TRUE
FROM categories WHERE slug = 'cocteles';


-- ============================================
-- 9. PRODUCTOS DE EJEMPLO
-- ============================================

-- === ENTRADAS ===
INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Ceviche Clásico', 'Ceviche', 'Pescado fresco marinado en limón con cebolla, ají y camote', 38.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'ceviches';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Ceviche Mixto', 'Ceviche Mix', 'Pescado y mariscos en leche de tigre', 48.00, 'COCINA', 2, TRUE, TRUE
FROM categories WHERE slug = 'ceviches';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Tiradito de Pescado', 'Tiradito', 'Láminas de pescado en salsa de ají amarillo', 36.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'tiraditos';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Causa Limeña', 'Causa', 'Causa de papa amarilla rellena de pollo', 28.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'causas';

-- === PLATOS DE FONDO ===
INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Lomo Saltado', 'Lomo Salt.', 'Lomo fino salteado con papas fritas y arroz', 42.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'carnes';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Lomo Saltado de Pollo', 'Lomo Pollo', 'Pollo salteado estilo lomo con papas y arroz', 35.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'pollo';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Ají de Gallina', 'Ají Gallina', 'Pollo deshilachado en crema de ají amarillo', 32.00, 'COCINA', 2, TRUE, TRUE
FROM categories WHERE slug = 'pollo';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Arroz con Mariscos', 'Arroz Mar.', 'Arroz cremoso con mariscos variados', 45.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'arroces';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Arroz Chaufa', 'Chaufa', 'Arroz salteado estilo oriental con pollo', 30.00, 'COCINA', 2, TRUE, TRUE
FROM categories WHERE slug = 'arroces';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Jalea Mixta', 'Jalea', 'Fritura de pescado y mariscos con yuca frita', 52.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'pescados-mariscos';

-- === SOPAS ===
INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Chupe de Camarones', 'Chupe Cam.', 'Sopa cremosa de camarones arequipeña', 48.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'sopas-caldos';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Parihuela', 'Parihuela', 'Sopa de mariscos con ají panca', 45.00, 'COCINA', 2, TRUE, TRUE
FROM categories WHERE slug = 'sopas-caldos';

-- === BEBIDAS ===
INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Inca Kola Personal', 'Inca Kola', 'Inca Kola 500ml', 6.00, 'BEBIDAS', 1, TRUE, TRUE
FROM categories WHERE slug = 'gaseosas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Coca Cola Personal', 'Coca Cola', 'Coca Cola 500ml', 6.00, 'BEBIDAS', 2, TRUE, TRUE
FROM categories WHERE slug = 'gaseosas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Inca Kola 1.5L', 'Inca 1.5L', 'Inca Kola familiar 1.5 litros', 12.00, 'BEBIDAS', 3, TRUE, TRUE
FROM categories WHERE slug = 'gaseosas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Jugo de Maracuyá', 'Jgo Marac.', 'Jugo natural de maracuyá', 10.00, 'BEBIDAS', 1, TRUE, TRUE
FROM categories WHERE slug = 'jugos-naturales';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Jugo de Papaya', 'Jgo Papaya', 'Jugo natural de papaya', 10.00, 'BEBIDAS', 2, TRUE, TRUE
FROM categories WHERE slug = 'jugos-naturales';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Limonada', 'Limonada', 'Limonada natural refrescante', 8.00, 'BEBIDAS', 3, TRUE, TRUE
FROM categories WHERE slug = 'jugos-naturales';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Chicha Morada', 'Chicha', 'Chicha morada tradicional', 8.00, 'BEBIDAS', 1, TRUE, TRUE
FROM categories WHERE slug = 'chicha-refrescos';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Agua Mineral San Luis', 'Agua Min.', 'Agua mineral con gas 500ml', 5.00, 'BEBIDAS', 1, TRUE, TRUE
FROM categories WHERE slug = 'aguas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Agua San Luis Sin Gas', 'Agua S/Gas', 'Agua sin gas 500ml', 4.00, 'BEBIDAS', 2, TRUE, TRUE
FROM categories WHERE slug = 'aguas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Emoliente', 'Emoliente', 'Emoliente caliente tradicional', 6.00, 'BEBIDAS', 1, TRUE, TRUE
FROM categories WHERE slug = 'infusiones';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Café Pasado', 'Café', 'Café pasado peruano', 5.00, 'BEBIDAS', 2, TRUE, TRUE
FROM categories WHERE slug = 'infusiones';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Manzanilla', 'Manzanilla', 'Infusión de manzanilla', 4.00, 'BEBIDAS', 3, TRUE, TRUE
FROM categories WHERE slug = 'infusiones';

-- === COCTELES ===
INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Pisco Sour Clásico', 'P. Sour', 'Pisco sour tradicional peruano', 22.00, 'BAR', 1, TRUE, TRUE
FROM categories WHERE slug = 'pisco-sour';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Pisco Sour de Maracuyá', 'P.S. Marac', 'Pisco sour con maracuyá', 25.00, 'BAR', 2, TRUE, TRUE
FROM categories WHERE slug = 'pisco-sour';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Chilcano Clásico', 'Chilcano', 'Chilcano de pisco con ginger ale', 18.00, 'BAR', 1, TRUE, TRUE
FROM categories WHERE slug = 'chilcanos';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Chilcano de Maracuyá', 'Chilc. Mar', 'Chilcano con maracuyá', 20.00, 'BAR', 2, TRUE, TRUE
FROM categories WHERE slug = 'chilcanos';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Mojito', 'Mojito', 'Mojito cubano clásico', 22.00, 'BAR', 1, TRUE, TRUE
FROM categories WHERE slug = 'cocteles-clasicos';

-- === CERVEZAS ===
INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Cusqueña Dorada', 'Cusq. Dor.', 'Cerveza Cusqueña Dorada 330ml', 12.00, 'BAR', 1, TRUE, TRUE
FROM categories WHERE slug = 'cervezas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Cusqueña Negra', 'Cusq. Neg.', 'Cerveza Cusqueña Negra 330ml', 14.00, 'BAR', 2, TRUE, TRUE
FROM categories WHERE slug = 'cervezas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Pilsen Callao', 'Pilsen', 'Cerveza Pilsen Callao 330ml', 10.00, 'BAR', 3, TRUE, TRUE
FROM categories WHERE slug = 'cervezas';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Corona', 'Corona', 'Cerveza Corona Extra 355ml', 15.00, 'BAR', 4, TRUE, TRUE
FROM categories WHERE slug = 'cervezas';

-- === POSTRES ===
INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Suspiro a la Limeña', 'Suspiro', 'Postre tradicional limeño', 15.00, 'COCINA', 1, TRUE, TRUE
FROM categories WHERE slug = 'postres';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Arroz con Leche', 'Arroz Leche', 'Arroz con leche con canela', 12.00, 'COCINA', 2, TRUE, TRUE
FROM categories WHERE slug = 'postres';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Mazamorra Morada', 'Mazamorra', 'Mazamorra morada tradicional', 10.00, 'COCINA', 3, TRUE, TRUE
FROM categories WHERE slug = 'postres';

INSERT INTO products (category_id, name, short_name, description, price, area_preparacion, display_order, is_active, is_available)
SELECT id, 'Picarones', 'Picarones', 'Picarones con miel de chancaca', 18.00, 'COCINA', 4, TRUE, TRUE
FROM categories WHERE slug = 'postres';


-- ============================================
-- 10. VARIANTES DE PRODUCTOS
-- ============================================

-- Variantes para Lomo Saltado (Término de la carne)
INSERT INTO variant_groups (product_id, name, is_required, max_selections, display_order)
SELECT id, 'Término de la carne', TRUE, 1, 1
FROM products WHERE short_name = 'Lomo Salt.';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Término medio', 0.00, TRUE, 1
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Lomo Salt.' AND vg.name = 'Término de la carne';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Tres cuartos', 0.00, FALSE, 2
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Lomo Salt.' AND vg.name = 'Término de la carne';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Bien cocido', 0.00, FALSE, 3
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Lomo Salt.' AND vg.name = 'Término de la carne';

-- Variantes para Lomo Saltado (Extras)
INSERT INTO variant_groups (product_id, name, is_required, max_selections, display_order)
SELECT id, 'Extras', FALSE, 3, 2
FROM products WHERE short_name = 'Lomo Salt.';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Extra carne', 12.00, FALSE, 1
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Lomo Salt.' AND vg.name = 'Extras';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Extra papas', 5.00, FALSE, 2
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Lomo Salt.' AND vg.name = 'Extras';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Con huevo frito', 4.00, FALSE, 3
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Lomo Salt.' AND vg.name = 'Extras';

-- Variantes para Arroz Chaufa (Tipo de proteína)
INSERT INTO variant_groups (product_id, name, is_required, max_selections, display_order)
SELECT id, 'Tipo de proteína', TRUE, 1, 1
FROM products WHERE short_name = 'Chaufa';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Pollo', 0.00, TRUE, 1
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Chaufa' AND vg.name = 'Tipo de proteína';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Carne', 5.00, FALSE, 2
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Chaufa' AND vg.name = 'Tipo de proteína';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Mariscos', 10.00, FALSE, 3
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Chaufa' AND vg.name = 'Tipo de proteína';

INSERT INTO variant_options (variant_group_id, name, price_modifier, is_default, display_order)
SELECT vg.id, 'Mixto', 8.00, FALSE, 4
FROM variant_groups vg
JOIN products p ON vg.product_id = p.id
WHERE p.short_name = 'Chaufa' AND vg.name = 'Tipo de proteína';


-- ============================================
-- 11. MESAS POR PISO
-- ============================================

-- Mesas del Primer Piso (Rango 100)
INSERT INTO tables (floor_id, number, name, capacity, status, pos_x, pos_y, is_active)
SELECT f.id, 101, 'Mesa 101', 4, 'LIBRE'::table_status, 100, 100, TRUE FROM floors f WHERE f.level = 1
UNION ALL SELECT f.id, 102, 'Mesa 102', 4, 'LIBRE'::table_status, 200, 100, TRUE FROM floors f WHERE f.level = 1
UNION ALL SELECT f.id, 103, 'Mesa 103', 4, 'LIBRE'::table_status, 300, 100, TRUE FROM floors f WHERE f.level = 1
UNION ALL SELECT f.id, 104, 'Mesa 104', 6, 'LIBRE'::table_status, 100, 200, TRUE FROM floors f WHERE f.level = 1
UNION ALL SELECT f.id, 105, 'Mesa 105', 6, 'LIBRE'::table_status, 200, 200, TRUE FROM floors f WHERE f.level = 1
UNION ALL SELECT f.id, 106, 'Mesa 106', 2, 'LIBRE'::table_status, 300, 200, TRUE FROM floors f WHERE f.level = 1
UNION ALL SELECT f.id, 107, 'Mesa 107', 2, 'LIBRE'::table_status, 400, 100, TRUE FROM floors f WHERE f.level = 1
UNION ALL SELECT f.id, 108, 'Mesa 108', 8, 'LIBRE'::table_status, 400, 200, TRUE FROM floors f WHERE f.level = 1;

-- Mesas del Segundo Piso (Rango 200)
INSERT INTO tables (floor_id, number, name, capacity, status, pos_x, pos_y, is_active)
SELECT f.id, 201, 'Mesa 201', 4, 'LIBRE'::table_status, 100, 100, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 202, 'Mesa 202', 4, 'LIBRE'::table_status, 200, 100, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 203, 'Mesa 203', 4, 'LIBRE'::table_status, 300, 100, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 204, 'Mesa 204', 4, 'LIBRE'::table_status, 400, 100, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 205, 'Mesa 205', 6, 'LIBRE'::table_status, 100, 200, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 206, 'Mesa 206', 6, 'LIBRE'::table_status, 200, 200, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 207, 'Mesa 207', 6, 'LIBRE'::table_status, 300, 200, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 208, 'Mesa 208', 8, 'LIBRE'::table_status, 400, 200, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 209, 'Mesa 209', 10, 'LIBRE'::table_status, 100, 300, TRUE FROM floors f WHERE f.level = 2
UNION ALL SELECT f.id, 210, 'Mesa 210', 10, 'LIBRE'::table_status, 300, 300, TRUE FROM floors f WHERE f.level = 2;

-- Mesas del Tercer Piso - Terraza/Bar (Rango 300)
INSERT INTO tables (floor_id, number, name, capacity, status, pos_x, pos_y, is_active)
SELECT f.id, 301, 'Terraza 301', 4, 'LIBRE'::table_status, 100, 100, TRUE FROM floors f WHERE f.level = 3
UNION ALL SELECT f.id, 302, 'Terraza 302', 4, 'LIBRE'::table_status, 200, 100, TRUE FROM floors f WHERE f.level = 3
UNION ALL SELECT f.id, 303, 'Terraza 303', 4, 'LIBRE'::table_status, 300, 100, TRUE FROM floors f WHERE f.level = 3
UNION ALL SELECT f.id, 304, 'Terraza 304', 6, 'LIBRE'::table_status, 100, 200, TRUE FROM floors f WHERE f.level = 3
UNION ALL SELECT f.id, 305, 'VIP 305', 8, 'LIBRE'::table_status, 200, 200, TRUE FROM floors f WHERE f.level = 3
UNION ALL SELECT f.id, 306, 'VIP 306', 8, 'LIBRE'::table_status, 300, 200, TRUE FROM floors f WHERE f.level = 3
UNION ALL SELECT f.id, 307, 'Barra 307', 6, 'LIBRE'::table_status, 400, 150, TRUE FROM floors f WHERE f.level = 3;