import logging
from escpos.printer import Network, Usb, File
from config import Config

logger = logging.getLogger(__name__)


class DummyPrinter:
    def __init__(self):
        self._buffer = []

    def set(self, **kwargs):
        pass

    def text(self, text):
        self._buffer.append(text)

    def cut(self):
        self._buffer.append('[CUT]')

    def close(self):
        output = ''.join(self._buffer)
        logger.info(f'[DUMMY] Output ({len(self._buffer)} lines):\n{output}')

    def image(self, path):
        self._buffer.append(f'[IMAGE: {path}]')

    def barcode(self, code, **kwargs):
        self._buffer.append(f'[BARCODE: {code}]')

    def qr(self, text, **kwargs):
        self._buffer.append(f'[QR: {text}]')


# Common USB vendor/product IDs for POS/thermal printers
COMMON_USB_IDS = [
    (0x0416, 0x0111),  # Winbond/Bixolon/Bematech común
    (0x0416, 0x5011),  # Winbond 2connect
    (0x04b8, 0x0202),  # Epson TM-T20
    (0x04b8, 0x0e15),  # Epson TM-m30 / TM-T88
    (0x04b8, 0x0e03),  # Epson TM-T88V
    (0x04b8, 0x0e0f),  # Epson TM-T20II
    (0x04b8, 0x0e28),  # Epson TM-T20III
    (0x04b9, 0x0015),  # Star Micronics
    (0x0525, 0xa800),  # Star Micronics (viejo)
    (0x0fe6, 0x811e),  # 2connect / Winbond
    (0x1fc9, 0x2016),  # NXP / 2connect
    (0x0483, 0x5840),  # STMicroelectronics / Some thermal
    (0x067b, 0x2305),  # Prolific / some generic
    (0x1504, 0x0006),  # 2connect (Chongqing)
]


def _find_usb_printer():
    """Try to auto-detect any connected USB POS printer."""
    import usb.core
    import usb.backend.libusb1 as libusb
    import usb.backend.libusb0 as libusb0

    for vid, pid in COMMON_USB_IDS:
        try:
            dev = usb.core.find(idVendor=vid, idProduct=pid)
            if dev is not None:
                logger.info(f'Impresora USB detectada: VendorID={hex(vid)}, ProductID={hex(pid)}')
                return vid, pid
        except Exception:
            continue

    # Fallback: try to find ANY printer-class device
    try:
        backends = []
        try:
            backends.append(libusb.get_backend())
        except Exception:
            pass
        try:
            backends.append(libusb0.get_backend())
        except Exception:
            pass
        for backend in backends:
            if not backend:
                continue
            for dev in usb.core.find(find_all=True, backend=backend):
                try:
                    if dev.bDeviceClass == 7:  # Printer class
                        vid = dev.idVendor
                        pid = dev.idProduct
                        logger.info(f'Impresora USB detectada por clase: VendorID={hex(vid)}, ProductID={hex(pid)}')
                        return vid, pid
                except Exception:
                    continue
    except Exception:
        pass

    return None, None


def get_default_printer(config: Config = None):
    from config import Config as Cfg
    cfg = config or Cfg

    conn_type = cfg.PRINTER_CONNECTION_TYPE

    try:
        if conn_type == 'network':
            ip = cfg.PRINTER_NETWORK_IP
            port = cfg.PRINTER_NETWORK_PORT
            logger.info(f'Conectando a impresora de red: {ip}:{port}')
            return Network(ip, port=port, timeout=10)

        elif conn_type == 'usb':
            vendor_id = int(cfg.PRINTER_USB_VENDOR_ID, 16)
            product_id = int(cfg.PRINTER_USB_PRODUCT_ID, 16)
            out_ep = cfg.PRINTER_USB_OUT_EP
            in_ep = cfg.PRINTER_USB_IN_EP
            logger.info(f'Conectando a impresora USB: VendorID={hex(vendor_id)}, ProductID={hex(product_id)}, OUT_EP={hex(out_ep)}, IN_EP={hex(in_ep)}')
            return Usb(vendor_id, product_id, out_ep=out_ep, in_ep=in_ep, timeout=10)

        elif conn_type == 'auto':
            logger.info('Auto-detectando impresora USB...')
            vid, pid = _find_usb_printer()
            if vid and pid:
                logger.info(f'Conectando a impresora detectada: {hex(vid)}:{hex(pid)}')
                try:
                    return Usb(vid, pid, out_ep=cfg.PRINTER_USB_OUT_EP, in_ep=cfg.PRINTER_USB_IN_EP, timeout=10)
                except Exception as e:
                    logger.error(f'Error conectando USB detectada: {e}')
            logger.warning('No se encontró impresora USB. Usando fallback DUMMY.')
            return DummyPrinter()

        elif conn_type == 'file':
            path = cfg.PRINTER_FILE_PATH
            logger.info(f'Imprimiendo a archivo: {path}')
            return File(path)

        else:
            logger.info('Modo DUMMY activado — no se imprimirá físicamente')
            return DummyPrinter()

    except Exception as e:
        logger.error(f'Error al conectar impresora ({conn_type}): {e}')
        logger.warning('Fallback a DUMMY')
        return DummyPrinter()
