import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import {
  area_preparacion,
  PrismaClient,
  table_status,
  tipo_documento_identidad,
  user_role,
} from '../src/generated/prisma/client';
import * as bcrypt from 'bcryptjs';

config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('--- Iniciando Seed: Ice Mankora ---');

  // 1. configuracion del sistema
  const configs = [
    { key: 'IGV_PERCENTAGE', value: '18', description: 'Porcentaje de IGV' },
    {
      key: 'RESTAURANT_NAME',
      value: 'ICE MANKORA',
      description: 'Nombre del restaurante',
    },
    { key: 'CURRENCY_SYMBOL', value: 'S/', description: 'Símbolo de moneda' },
  ];

  const newConfigs = await prisma.system_config.createMany({
    data: configs,
    skipDuplicates: true,
  });

  console.log('new configs: ', newConfigs);

  // 2. pisos
  const floor1 = await prisma.floors.upsert({
    where: { level: 1 },
    update: {},
    create: {
      name: 'Primer Piso',
      level: 1,
      description: 'Área del primer piso',
    },
  });

  const floor2 = await prisma.floors.upsert({
    where: { level: 2 },
    update: {},
    create: {
      name: 'Segundo Piso',
      level: 2,
      description: 'Área del segundo piso',
    },
  });

  const floor3 = await prisma.floors.upsert({
    where: { level: 3 },
    update: {},
    create: {
      name: 'Tercer Piso',
      level: 3,
      description: 'Área del tercer piso',
    },
  });

  console.log('new floors: ', [floor1, floor2, floor3]);

  // 3. usuario administrador (password: admin123)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const newAdmin = await prisma.users.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      dni: '00000000',
      username: 'admin',
      password_hash: passwordHash,
      role: user_role.ADMIN,
      pin: '111111',
      user_floors: {
        create: [
          { floor: { connect: { id: floor1.id } } },
          { floor: { connect: { id: floor2.id } } },
          { floor: { connect: { id: floor3.id } } },
        ],
      },
    },
  });

  const passwordHashMesero = await bcrypt.hash('mesero123', salt);
  const newMesero = await prisma.users.upsert({
    where: { username: 'mesero' },
    update: {},
    create: {
      name: 'Mesero',
      dni: '22222222',
      username: 'mesero',
      password_hash: passwordHashMesero,
      role: user_role.MESERO,
      pin: '222222',
      user_floors: {
        create: [
          { floor: { connect: { id: floor1.id } } },
          { floor: { connect: { id: floor2.id } } },
          { floor: { connect: { id: floor3.id } } },
        ],
      },
    },
  });

  console.log('new users: ', [newAdmin, newMesero]);

  // 4. cliente generico
  const newClient = await prisma.clients.upsert({
    where: {
      tipo_documento_numero_documento: {
        tipo_documento: 'SIN_DOC',
        numero_documento: '00000000',
      },
    },
    update: {},
    create: {
      tipo_documento: tipo_documento_identidad.SIN_DOC,
      numero_documento: '00000000',
      razon_social: 'CLIENTE VARIOS',
    },
  });

  console.log('new clients: ', [newClient]);

  // 5. categorias y subcategorias
  const catEntradas = await prisma.categories.upsert({
    where: { slug: 'entradas' },
    update: {},
    create: {
      name: 'Entradas',
      slug: 'entradas',
      default_area: area_preparacion.COCINA,
      color: '#FF6B6B',
      children: {
        create: [
          { name: 'Ceviches', slug: 'ceviches', level: 1 },
          { name: 'Causas', slug: 'causas', level: 1 },
          { name: 'Sopa Wantan', slug: 'sopa-wantan', level: 1 },
        ],
      },
    },
  });

  const catFondos = await prisma.categories.upsert({
    where: { slug: 'platos-fondo' },
    update: {},
    create: {
      name: 'Platos de Fondo',
      slug: 'platos-fondo',
      default_area: area_preparacion.COCINA,
      color: '#4ECDC4',
      children: {
        create: [
          { name: 'Carnes', slug: 'carnes', level: 1 },
          { name: 'Arroces', slug: 'arroces', level: 1 },
        ],
      },
    },
  });

  console.log('new categories: ', [catEntradas, catFondos]);

  // 6. productos
  const subCarne = await prisma.categories.findFirst({
    where: { slug: 'carnes' },
  });

  if (subCarne) {
    const newProduct = await prisma.products.upsert({
      where: { name: 'Lomo Saltado' },
      update: {},
      create: {
        category_id: subCarne.id,
        name: 'Lomo Saltado',
        short_name: 'Lomo Salt.',
        price: 42.0,
        area_preparacion: area_preparacion.COCINA,
        variant_groups: {
          create: {
            name: 'Término de la carne',
            is_required: true,
            options: {
              create: [
                { name: 'Término medio', is_default: true },
                { name: 'Tres cuartos' },
                { name: 'Bien cocido' },
              ],
            },
          },
        },
      },
    });

    console.log('new product: ', [newProduct]);
  }

  // 7. mesas (piso 1: 101-105, piso 2: 201-205, piso 3: 301-305)
  const floors = [floor1, floor2, floor3];

  for (const f of floors) {
    for (let i = 1; i <= 10; i++) {
      const tableNum = f.level * 100 + i;
      const newTable = await prisma.tables.upsert({
        where: { floor_id_number: { floor_id: f.id, number: tableNum } },
        update: {},
        create: {
          floor_id: f.id,
          number: tableNum,
          name: `Mesa ${tableNum}`,
          status: table_status.LIBRE,
        },
      });

      console.log(`Table: ${newTable.name}`);
    }
  }

  console.log('--- Seed completado con éxito ---');
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
