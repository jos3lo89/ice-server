import { Injectable, Logger } from '@nestjs/common';
import { printers } from 'src/generated/prisma/client';

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  /**
   * Imprime un documento de prueba (simulado en consola)
   */
  async printTest(printer: printers) {
    try {
      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`IMPRESIÓN DE PRUEBA - ${printer.name.toUpperCase()}`);
      this.logger.log(`${'='.repeat(60)}\n`);

      const testContent = this.generateTestPrintContent(printer);

      console.log(testContent);

      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`FIN DE IMPRESIÓN DE PRUEBA`);
      this.logger.log(`${'='.repeat(60)}\n`);

      return true;
    } catch (error) {
      this.logger.error(`Error al imprimir prueba: ${error.message}`);
      return false;
    }
  }

  /**
   * Genera el contenido de la página de prueba
   */
  private generateTestPrintContent(printer: printers) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('es-PE');

    let content = '';

    // Encabezado centrado
    content += this.centerText('ICE MANKORA', 48) + '\n';
    content += this.centerText('SISTEMA DE GESTIÓN', 48) + '\n';
    content += this.centerText('═'.repeat(48), 48) + '\n';
    content += '\n';

    // Información de la impresora
    content += this.leftRightText('IMPRESORA:', printer.name, 48) + '\n';
    content += this.leftRightText('TIPO:', printer.type, 48) + '\n';
    content +=
      this.leftRightText('CONEXIÓN:', printer.connection_type, 48) + '\n';

    if (printer.address) {
      content += this.leftRightText('DIRECCIÓN:', printer.address, 48) + '\n';
    }

    content += this.leftRightText('ÁREA:', printer.area, 48) + '\n';
    content +=
      this.leftRightText(
        'PREDETERMINADA:',
        printer.is_default ? 'SÍ' : 'NO',
        48,
      ) + '\n';
    content +=
      this.leftRightText(
        'ESTADO:',
        printer.is_active ? 'ACTIVA' : 'INACTIVA',
        48,
      ) + '\n';
    content += '\n';
    content += '-'.repeat(48) + '\n';
    content += '\n';

    // Fecha y hora
    content += this.centerText('PÁGINA DE PRUEBA', 48) + '\n';
    content += '\n';
    content += this.leftRightText('FECHA:', dateStr, 48) + '\n';
    content += this.leftRightText('HORA:', timeStr, 48) + '\n';
    content += '\n';

    // Ejemplo de pedido
    content += '═'.repeat(48) + '\n';
    content += this.centerText('EJEMPLO DE PEDIDO', 48) + '\n';
    content += '═'.repeat(48) + '\n';
    content += '\n';
    content += this.leftRightText('MESA:', '5', 48) + '\n';
    content += this.leftRightText('MESERO:', 'Juan Pérez', 48) + '\n';
    content += this.leftRightText('ORDEN:', '#15', 48) + '\n';
    content += this.leftRightText('COMENSALES:', '4', 48) + '\n';
    content += '\n';
    content += '-'.repeat(48) + '\n';
    content += '\n';

    // Items de ejemplo
    content += 'CANT  DESCRIPCIÓN                        PRECIO\n';
    content += '-'.repeat(48) + '\n';
    content += this.formatOrderLine(2, 'Lomo Saltado', 42.0) + '\n';
    content += '      └─ Término: 3/4\n';
    content += '      └─ Extra: Papas\n';
    content += this.formatOrderLine(1, 'Ají de Gallina', 38.0) + '\n';
    content += this.formatOrderLine(4, 'Chicha Morada', 8.0) + '\n';
    content += this.formatOrderLine(2, 'Cusqueña', 12.0) + '\n';
    content += '\n';
    content += '-'.repeat(48) + '\n';
    content += this.leftRightText('SUBTOTAL:', 'S/ 132.00', 48) + '\n';
    content += '═'.repeat(48) + '\n';
    content += '\n';

    // Pie de página
    content += this.centerText('PRUEBA EXITOSA', 48) + '\n';
    content +=
      this.centerText('✓ La impresora está funcionando correctamente', 48) +
      '\n';
    content += '\n';
    content += this.centerText('═'.repeat(48), 48) + '\n';
    content += this.centerText('Gracias por usar ICE MANKORA', 48) + '\n';
    content += this.centerText('www.icemankora.com', 48) + '\n';

    return content;
  }

  /**
   * Centra un texto en el ancho especificado
   */
  private centerText(text: string, width: number) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Formatea texto alineado a izquierda y derecha
   */
  private leftRightText(left: string, right: string, width: number): string {
    const spaces = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  }

  /**
   * Formatea una línea de pedido
   */
  private formatOrderLine(
    quantity: number,
    description: string,
    price: number,
  ) {
    const qtyStr = quantity.toString().padEnd(5);
    const priceStr = `S/ ${price.toFixed(2)}`.padStart(10);
    const maxDescLength = 30;

    let desc = description;
    if (desc.length > maxDescLength) {
      desc = desc.substring(0, maxDescLength - 3) + '...';
    }
    desc = desc.padEnd(maxDescLength);

    return `${qtyStr} ${desc} ${priceStr}`;
  }

  /**
   * Imprime un pedido de cocina (simulado)
   */
  async printKitchenOrder(printer: printers, orderData: any) {
    try {
      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`IMPRIMIENDO EN: ${printer.name.toUpperCase()}`);
      this.logger.log(`${'='.repeat(60)}\n`);

      const content = this.generateKitchenOrderContent(orderData);

      console.log(content);

      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`IMPRESIÓN COMPLETADA`);
      this.logger.log(`${'='.repeat(60)}\n`);

      return true;
    } catch (error) {
      this.logger.error(`Error al imprimir pedido: ${error.message}`);
      return false;
    }
  }

  /**
   * Genera contenido de pedido de cocina
   */
  private generateKitchenOrderContent(orderData: any) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-PE');

    let content = '';

    content += this.centerText('═'.repeat(48), 48) + '\n';
    content += this.centerText(`${orderData.area || 'COCINA'}`, 48) + '\n';
    content += this.centerText('═'.repeat(48), 48) + '\n';
    content += '\n';

    content +=
      this.leftRightText('ORDEN:', `#${orderData.orderNumber}`, 48) + '\n';
    content += this.leftRightText('MESA:', orderData.table, 48) + '\n';
    content += this.leftRightText('MESERO:', orderData.waiter, 48) + '\n';
    content += this.leftRightText('HORA:', timeStr, 48) + '\n';
    content += '\n';
    content += '-'.repeat(48) + '\n';
    content += '\n';

    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach((item: any) => {
        content += `${item.quantity}x ${item.name}\n`;

        if (item.variants && item.variants.length > 0) {
          item.variants.forEach((variant: any) => {
            content += `   └─ ${variant}\n`;
          });
        }

        if (item.notes) {
          content += `   ** ${item.notes} **\n`;
        }

        content += '\n';
      });
    }

    content += '-'.repeat(48) + '\n';
    content +=
      this.centerText(`COMENSALES: ${orderData.dinersCount || 0}`, 48) + '\n';
    content += '\n';

    return content;
  }

  /**
   * Verifica el estado de una impresora (simulado)
   */
  async checkPrinterStatus(printer: printers) {
    // En una implementación real, aquí verificarías la conexión real
    // Por ahora simulamos que está online si está activa
    if (printer.is_active) {
      return 'online';
    }
    return 'offline';
  }
}
