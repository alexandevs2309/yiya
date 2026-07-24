import logging
from django.conf import settings
from escpos.printer import Network, Usb, Dummy

logger = logging.getLogger(__name__)

def get_printer():
    """
    Obtiene la instancia de la impresora configurada en Django Settings / .env.
    Soporta conexiones por Network (IP), USB y Dummy (para depuración).
    """
    conn_type = getattr(settings, 'PRINTER_CONNECTION_TYPE', 'dummy').lower()
    
    try:
        if conn_type == 'network':
            ip = getattr(settings, 'PRINTER_NETWORK_IP', '192.168.1.100')
            port = int(getattr(settings, 'PRINTER_NETWORK_PORT', 9100))
            logger.info(f"Conectando a impresora de red: {ip}:{port}")
            return Network(ip, port=port)
            
        elif conn_type == 'usb':
            vendor_id = int(getattr(settings, 'PRINTER_USB_VENDOR_ID', '0x04b8'), 16)
            product_id = int(getattr(settings, 'PRINTER_USB_PRODUCT_ID', '0x0202'), 16)
            logger.info(f"Conectando a impresora USB: VendorID={hex(vendor_id)}, ProductID={hex(product_id)}")
            return Usb(vendor_id, product_id)
            
        else:
            logger.info("Impresora configurada en modo DUMMY (consola/depuración)")
            return Dummy()
            
    except Exception as e:
        logger.error(f"Error al inicializar la impresora física ({conn_type}): {e}")
        # Retornamos Dummy como fallback para evitar que falle el backend
        return Dummy()


def imprimir_ticket_pago(payment, order):
    """
    Imprime un ticket de pago/recibo de caja con formato ESC/POS de 80mm.
    """
    p = get_printer()
    
    try:
        # Centrado y cabecera
        p.set(align='center', double_height=True, double_width=True)
        p.text(f"{settings.RESTAURANT_NAME}\n")
        
        p.set(align='center')
        p.text("Samaná, República Dominicana\n")
        p.text(f"RNC: {settings.DGII_RNC}\n")
        p.text("--------------------------------\n")
        
        # Información de la transacción
        p.set(align='left')
        p.text(f"Fecha: {payment.created_at.strftime('%d/%m/%Y %H:%M')}\n")
        p.text(f"Mesa: {order.table.number if order.table else '—'} | Servido por: {order.waiter.get_full_name() or order.waiter.username}\n")
        
        # NCF y e-CF si existe
        ecf = payment.ecf_documents.first()
        if ecf and ecf.ncf:
            p.text(f"NCF: {ecf.ncf}\n")
            if ecf.rnc_cliente:
                p.text(f"RNC Cliente: {ecf.rnc_cliente}\n")
            if ecf.razon_social_cliente:
                p.text(f"Cliente: {ecf.razon_social_cliente}\n")
        else:
            p.text("RECIBO PROVISIONAL DE CAJA\n")
            
        p.text("--------------------------------\n")
        
        # Detalle de Items
        # Ajustado para ancho de 80mm (aprox 48 caracteres de ancho)
        p.text("Cant  Descripción              Precio    Total\n")
        p.text("--------------------------------\n")
        
        if payment.items_json:
            for item in payment.items_json:
                cant_str = f"{int(item['cantidad']):<5}"
                name_str = item['nombre'][:22]
                price_str = f"${float(item['precio']):>8.2f}"
                total_str = f"${float(item['precio'] * item['cantidad']):>8.2f}"
                p.text(f"{cant_str}{name_str:<22}{price_str}{total_str}\n")
                for mod in (item.get('modificadores') or []):
                    p.text(f"      + {mod[:30]}\n")
        else:
            for item in order.items.exclude(status='cancelled').all():
                cant_str = f"{item.quantity:<5}"
                name_str = item.name[:22]
                price_str = f"${float(item.price):>8.2f}"
                total_str = f"${float(item.price * item.quantity):>8.2f}"
                p.text(f"{cant_str}{name_str:<22}{price_str}{total_str}\n")
                for mod in (item.modifiers_json or []):
                    p.text(f"      + {mod['name'][:30]}\n")
                
        p.text("--------------------------------\n")
        
        # Totales
        p.set(align='right')
        p.text(f"Subtotal:  ${float(payment.subtotal):.2f}\n")
        p.text(f"ITBIS (18%):  ${float(payment.itbis):.2f}\n")
        p.text(f"Propina Ley (10%):  ${float(payment.propina):.2f}\n")
        
        p.set(align='right', double_height=True)
        p.text(f"TOTAL:  ${float(payment.total):.2f}\n")
        
        p.set(align='left')
        p.text("--------------------------------\n")
        p.text(f"Método de Pago: {payment.get_method_display()}\n")
        if payment.cash_received:
            p.text(f"Efectivo Recibido: ${float(payment.cash_received):.2f}\n")
            p.text(f"Cambio Entregado:  ${float(payment.change_given):.2f}\n")
            
        # Pie de página
        p.set(align='center')
        p.text("\n¡Gracias por su visita!\n\n\n")
        
        # Corte de papel
        p.cut()
        logger.info(f"Ticket impreso correctamente para el pago {payment.id.hex[:8]}")
        
    except Exception as e:
        logger.error(f"Error al imprimir el ticket ESC/POS: {e}")
        
    finally:
        # Cerrar conexión si aplica
        try:
            if hasattr(p, 'close'):
                p.close()
        except Exception:
            pass


def imprimir_comanda_cocina(order, items_enviados):
    """
    Imprime una comanda de envío a cocina con formato ESC/POS de 80mm.
    """
    if not items_enviados:
        return
        
    p = get_printer()
    
    try:
        p.set(align='center', double_height=True, double_width=True)
        p.text("=== COMANDA DE COCINA ===\n")
        
        p.set(align='left', double_height=True)
        p.text(f"MESA: {order.table.number if order.table else '—'}\n")
        
        p.set(align='left')
        p.text(f"Fecha/Hora: {order.updated_at.strftime('%d/%m/%Y %H:%M')}\n")
        p.text(f"Mesero: {order.waiter.get_full_name() or order.waiter.username}\n")
        p.text("--------------------------------\n")
        
        p.set(align='left', double_height=True)
        for item in items_enviados:
            p.text(f"[ ] {item.quantity}x {item.name}\n")
            for mod in (item.modifiers_json or []):
                p.text(f"    * {mod['name']}\n")
                
        p.set(align='left')
        p.text("--------------------------------\n")
        if order.notes:
            p.set(double_height=True)
            p.text(f"NOTAS: {order.notes}\n")
            
        p.text("\n\n\n")
        p.cut()
        logger.info(f"Comanda de cocina impresa correctamente para orden {order.id.hex[:8]}")
        
    except Exception as e:
        logger.error(f"Error al imprimir la comanda de cocina ESC/POS: {e}")
        
    finally:
        try:
            if hasattr(p, 'close'):
                p.close()
        except Exception:
            pass
