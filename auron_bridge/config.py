import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))


class Config:
    API_BASE_URL = os.getenv('BRIDGE_API_URL', 'http://localhost:8000/api')
    BRIDGE_TOKEN = os.getenv('BRIDGE_TOKEN', 'auron-bridge-dev-token')
    POLL_INTERVAL = int(os.getenv('BRIDGE_POLL_INTERVAL', '2'))
    LOG_LEVEL = os.getenv('BRIDGE_LOG_LEVEL', 'INFO').upper()

    PRINTER_CONNECTION_TYPE = os.getenv('PRINTER_CONNECTION_TYPE', 'dummy').lower()
    PRINTER_NETWORK_IP = os.getenv('PRINTER_NETWORK_IP', '192.168.1.100')
    PRINTER_NETWORK_PORT = int(os.getenv('PRINTER_NETWORK_PORT', '9100'))
    PRINTER_USB_VENDOR_ID = os.getenv('PRINTER_USB_VENDOR_ID', '0x04b8')
    PRINTER_USB_PRODUCT_ID = os.getenv('PRINTER_USB_PRODUCT_ID', '0x0202')
    PRINTER_USB_OUT_EP = int(os.getenv('PRINTER_USB_OUT_EP', '0x02'), 16)
    PRINTER_USB_IN_EP = int(os.getenv('PRINTER_USB_IN_EP', '0x82'), 16)
    PRINTER_FILE_PATH = os.getenv('PRINTER_FILE_PATH', '/tmp/print_output.txt')
    PAPER_WIDTH = int(os.getenv('PAPER_WIDTH', '48'))
