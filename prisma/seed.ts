import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import {
  area_preparacion,
  PrismaClient,
  table_status,
  tipo_documento_identidad,
  user_role,
} from 'src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('--- Iniciando Seed: Ice Mankora ---');

  // // 1. Configuración del Sistema
  // const configs = [
  //   { key: 'IGV_PERCENTAGE', value: '18', description: 'Porcentaje de IGV' },
  //   {
  //     key: 'RESTAURANT_NAME',
  //     value: 'ICE MANKORA',
  //     description: 'Nombre del restaurante',
  //   },
  //   { key: 'CURRENCY_SYMBOL', value: 'S/', description: 'Símbolo de moneda' },
  //   {
  //     key: 'MAX_DINERS_PER_TABLE',
  //     value: '20',
  //     description: 'Máximo comensales por mesa',
  //   },
  // ];

  // for (const config of configs) {
  //   await prisma.system_config.upsert({
  //     where: { key: config.key },
  //     update: {},
  //     create: config,
  //   });
  // }

  // // 2. Pisos
  // const floor1 = await prisma.floors.upsert({
  //   where: { level: 1 },
  //   update: {},
  //   create: { name: 'Primer Piso', level: 1, description: 'Área principal' },
  // });

  // const floor2 = await prisma.floors.upsert({
  //   where: { level: 2 },
  //   update: {},
  //   create: { name: 'Segundo Piso', level: 2, description: 'Área de mesas' },
  // });

  // const floor3 = await prisma.floors.upsert({
  //   where: { level: 3 },
  //   update: {},
  //   create: { name: 'Tercer Piso', level: 3, description: 'Terraza / Bar' },
  // });

  // // 3. Usuario Administrador (Password: admin123)
  // const salt = await bcrypt.genSalt(10);
  // const passwordHash = await bcrypt.hash('admin123', salt);

  // await prisma.users.upsert({
  //   where: { username: 'admin' },
  //   update: {},
  //   create: {
  //     name: 'Administrador',
  //     dni: '00000000',
  //     username: 'admin',
  //     password_hash: passwordHash,
  //     role: user_role.ADMIN,
  //     pin: '123456',
  //     user_floors: {
  //       create: [
  //         { floor: { connect: { id: floor1.id } } },
  //         { floor: { connect: { id: floor2.id } } },
  //         { floor: { connect: { id: floor3.id } } },
  //       ],
  //     },
  //   },
  // });

  // // 4. Cliente Genérico
  // await prisma.clients.upsert({
  //   where: {
  //     tipo_documento_numero_documento: {
  //       tipo_documento: 'SIN_DOC',
  //       numero_documento: '00000000',
  //     },
  //   },
  //   update: {},
  //   create: {
  //     tipo_documento: tipo_documento_identidad.SIN_DOC,
  //     numero_documento: '00000000',
  //     razon_social: 'CLIENTE VARIOS',
  //   },
  // });

  // // 5. Categorías y Subcategorías
  // const catEntradas = await prisma.categories.create({
  //   data: {
  //     name: 'Entradas',
  //     slug: 'entradas',
  //     default_area: area_preparacion.COCINA,
  //     color: '#FF6B6B',
  //     children: {
  //       create: [
  //         { name: 'Ceviches', slug: 'ceviches', level: 1 },
  //         { name: 'Causas', slug: 'causas', level: 1 },
  //       ],
  //     },
  //   },
  // });

  // const catFondos = await prisma.categories.create({
  //   data: {
  //     name: 'Platos de Fondo',
  //     slug: 'platos-fondo',
  //     default_area: area_preparacion.COCINA,
  //     color: '#4ECDC4',
  //     children: {
  //       create: [
  //         { name: 'Carnes', slug: 'carnes', level: 1 },
  //         { name: 'Arroces', slug: 'arroces', level: 1 },
  //       ],
  //     },
  //   },
  // });

  // // 6. Productos (Ejemplo: Lomo Saltado)
  // const subCarne = await prisma.categories.findFirst({
  //   where: { slug: 'carnes' },
  // });
  // if (subCarne) {
  //   await prisma.products.create({
  //     data: {
  //       category_id: subCarne.id,
  //       name: 'Lomo Saltado',
  //       short_name: 'Lomo Salt.',
  //       price: 42.0,
  //       area_preparacion: area_preparacion.COCINA,
  //       variant_groups: {
  //         create: {
  //           name: 'Término de la carne',
  //           is_required: true,
  //           options: {
  //             create: [
  //               { name: 'Término medio', is_default: true },
  //               { name: 'Tres cuartos' },
  //               { name: 'Bien cocido' },
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   });
  // }

  // // 7. Mesas (Piso 1: 101-105, Piso 2: 201-205, Piso 3: 301-305)
  // const floors = [floor1, floor2, floor3];
  // for (const f of floors) {
  //   for (let i = 1; i <= 5; i++) {
  //     const tableNum = f.level * 100 + i;
  //     await prisma.tables.upsert({
  //       where: { floor_id_number: { floor_id: f.id, number: tableNum } },
  //       update: {},
  //       create: {
  //         floor_id: f.id,
  //         number: tableNum,
  //         name: `Mesa ${tableNum}`,
  //         capacity: i % 2 === 0 ? 6 : 4,
  //         status: table_status.LIBRE,
  //       },
  //     });
  //   }
  // }

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
