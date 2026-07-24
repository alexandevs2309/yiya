# Instalación del AURON Print Bridge — Guía para cada cliente

## Requisitos
- Python 3.10+
- Impresora térmica USB conectada a la PC de caja
- Docker con Django backend corriendo en `localhost:8000`

---

## 1. Identificar la impresora

Conecta la impresora USB y ejecuta:

```bash
lsusb
```

Busca una línea como:
```
Bus 001 Device 018: ID 0fe6:811e ICS Advent Parallel Adapter
```

Apunta el **VendorID** (`0x0fe6`) y **ProductID** (`0x811e`).

---

## 2. Verificar los endpoints USB

Algunas impresoras usan endpoint OUT `0x01` (default de python-escpos), otras usan `0x02`. Hay que verificarlo:

```bash
lsusb -v -d 0fe6:811e | grep -i endpoint
```

Debes ver algo como:
```
Endpoint Address: 0x02  OUT
Endpoint Address: 0x82  IN
```

Anota los valores de OUT e IN.

---

## 3. Configurar el archivo `.env`

Edita `auron_bridge/.env`:

```env
# URL del backend (si corre en Docker local)
BRIDGE_API_URL=http://localhost:8000/api

# Token de seguridad (debe coincidir con PRINT_BRIDGE_TOKEN del backend)
BRIDGE_TOKEN=auron-bridge-dev-token

BRIDGE_POLL_INTERVAL=2

# Tipo de conexión: auto | usb | network | dummy
PRINTER_CONNECTION_TYPE=auto

# Si el auto-detect no funciona, descomenta y ajusta estos valores:
# PRINTER_CONNECTION_TYPE=usb
# PRINTER_USB_VENDOR_ID=0x0fe6
# PRINTER_USB_PRODUCT_ID=0x811e
# PRINTER_USB_OUT_EP=0x02     # ← IMPORTANTE: el valor correcto para tu impresora
# PRINTER_USB_IN_EP=0x82      # ← IMPORTANTE: el valor correcto para tu impresora

PAPER_WIDTH=48
```

> **⚠️ REGLA DE ORO:** Si la impresora no imprime y ves error `Invalid endpoint address 0x1` en los logs, el OUT_EP correcto es `0x02` (no `0x01`). Cámbialo en el `.env`.

---

## 4. Dar permisos USB (udev)

Crea `/etc/udev/rules.d/99-pos-printer.rules`:

```bash
sudo tee /etc/udev/rules.d/99-pos-printer.rules << 'EOF'
# D'Yiya POS — Permisos para impresoras térmicas USB
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fe6", ATTRS{idProduct}=="811e", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="04b8", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0416", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

> Si la impresora tiene otro VendorID, agrega otra línea con ese ID.

---

## 5. Instalar el servicio systemd

```bash
cd ~/Escritorio/yiya_premiun/auron_bridge

# Crear y activar virtualenv (solo la primera vez)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copiar e instalar servicio
sudo cp auron-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable auron-bridge.service
sudo systemctl start auron-bridge.service
```

---

## 6. Verificar que funciona

```bash
# Ver estado
systemctl status auron-bridge.service

# Ver logs
journalctl -u auron-bridge.service -n 30 --no-pager

# Probar una impresión manual
source venv/bin/activate
python -c "
from config import Config
from printer import get_default_printer
cfg = Config()
printer = get_default_printer(cfg)
printer.set(align='center', double_height=True, bold=True)
printer.text('PRUEBA D\'YIYA POS\n')
printer.set(align='left', double_height=False, bold=False)
printer.text('Si ves esto, la impresora funciona!\n')
printer.cut()
printer.close()
"
```

---

## 7. Solución de problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| `Invalid endpoint address 0x1` | OUT_EP incorrecto | Cambiar a `PRINTER_USB_OUT_EP=0x02` en `.env` |
| `Access denied (insufficient permissions)` | Falta regla udev | Verificar paso 4, desconectar y conectar la impresora |
| `Device not found` | Auto-detect no encuentra la impresora | Usar `PRINTER_CONNECTION_TYPE=usb` con los IDs correctos |
| No imprime pero logs dicen "done" | El papel puede estar mal cargado o la impresora apagada | Revisar papel, encender impresora, resetear |
| Caracteres extraños (ñ, tildes) | La impresora no soporta CP437 | El bridge reemplaza automáticamente caracteres especiales |

---

## 8. Notas importantes

- El bridge **debe correr en la misma PC** donde está conectada la impresora USB
- Si el backend cambia de IP/puerto, actualizar `BRIDGE_API_URL` en `.env` y reiniciar el servicio
- El servicio **arranca solo** al encender la PC (systemd + `restart: always`)
- El token `BRIDGE_TOKEN` debe coincidir con `PRINT_BRIDGE_TOKEN` del backend (Django)
- Para ver logs en tiempo real: `journalctl -u auron-bridge.service -f`
- Después de cualquier cambio en `.env` o código: `systemctl restart auron-bridge.service`
