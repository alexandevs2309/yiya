"""
AURON Print Bridge — standalone ESC/POS print service for D'Yiya POS.

Polls the Railway Django backend for pending print jobs and sends them
to local thermal printers via USB or network (ESC/POS).

Usage:
    python main.py
    python main.py --once          # Process all pending jobs and exit
    python main.py --verbose       # Debug logging
"""

import argparse
import logging
import sys
import time
from datetime import datetime

import requests

from config import Config
from printer import get_default_printer, DummyPrinter
from templates.ticket_receipt import print_receipt
from templates.ticket_kitchen import print_kitchen

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S',
)
logger = logging.getLogger('auron_bridge')


class PrintBridge:
    def __init__(self, config: Config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'X-Bridge-Token': config.BRIDGE_TOKEN,
            'Accept': 'application/json',
        })
        self._running = False
        self._stats = {'processed': 0, 'failed': 0, 'skipped': 0}

    def _api(self, method, path, **kwargs):
        url = f'{self.config.API_BASE_URL}{path}'
        try:
            resp = self.session.request(method, url, timeout=15, **kwargs)
            resp.raise_for_status()
            return resp.json()
        except requests.ConnectionError:
            logger.warning(f'Conexión rehusada — backend no disponible: {url}')
        except requests.Timeout:
            logger.warning(f'Timeout — backend no responde: {url}')
        except requests.HTTPError as e:
            if e.response is not None:
                logger.error(f'HTTP {e.response.status_code}: {e.response.text[:200]}')
            else:
                logger.error(f'HTTP Error: {e}')
        except Exception as e:
            logger.error(f'Error en llamada API: {e}')
        return None

    def fetch_pending_jobs(self):
        result = self._api('GET', '/printing/jobs/pending/')
        return result if isinstance(result, list) else []

    def update_job_status(self, job_id: str, status: str, error: str = ''):
        payload = {'status': status}
        if error:
            payload['error_message'] = error
        self._api('POST', f'/printing/jobs/{job_id}/update/', json=payload)

    def process_job(self, job: dict) -> bool:
        job_id = job['id']
        job_type = job.get('type', 'receipt')
        data = job.get('data', {})
        copies = job.get('copies', 1)

        logger.info(f'Procesando trabajo {job_id[:8]} — tipo={job_type} copias={copies}')

        self.update_job_status(job_id, 'printing')

        try:
            printer = get_default_printer(self.config)

            for _ in range(copies):
                if job_type == 'receipt':
                    print_receipt(printer, data)
                elif job_type == 'kitchen':
                    print_kitchen(printer, data)
                elif job_type == 'test':
                    self._print_test(printer, data)
                else:
                    logger.warning(f'Tipo de trabajo desconocido: {job_type}')
                    self.update_job_status(job_id, 'failed', f'Tipo desconocido: {job_type}')
                    return False

            printer.close()
            self.update_job_status(job_id, 'done')
            self._stats['processed'] += 1
            logger.info(f'Trabajo {job_id[:8]} completado exitosamente')
            return True

        except Exception as e:
            logger.error(f'Error procesando trabajo {job_id[:8]}: {e}')
            self._stats['failed'] += 1
            self.update_job_status(job_id, 'failed', str(e))
            return False

    def _print_test(self, printer, data: dict):
        printer.set(align='center', double_height=True, double_width=True)
        printer.text('=== PRUEBA DE IMPRESIÓN ===\n')
        printer.set(align='left')
        printer.text(f'Impresora: {data.get("printer_name", "N/A")}\n')
        printer.text(f'Tipo: {data.get("type", "N/A")}\n')
        printer.text(f'Conexión: {data.get("connection", "N/A")}\n')
        printer.text(f'IP: {data.get("ip", "N/A")}:{data.get("port", "N/A")}\n')
        printer.text(f'Fecha: {datetime.now().strftime("%d/%m/%Y %H:%M")}\n')
        printer.text('--------------------------------\n')
        printer.set(align='center', double_height=True)
        printer.text('D\'Yiya POS\n')
        printer.set(align='center')
        printer.text('Si ves esto, la impresora funciona correctamente.\n\n')
        printer.cut()

    def poll_forever(self):
        self._running = True
        logger.info(f'AURON Print Bridge iniciado — polling cada {self.config.POLL_INTERVAL}s')
        logger.info(f'Backend: {self.config.API_BASE_URL}')
        logger.info(f'Impresora: {self.config.PRINTER_CONNECTION_TYPE.upper()}')

        while self._running:
            try:
                jobs = self.fetch_pending_jobs()
                if jobs:
                    logger.info(f'Encontrados {len(jobs)} trabajos pendientes')
                    for job in jobs:
                        if not self._running:
                            break
                        self.process_job(job)
                else:
                    time.sleep(self.config.POLL_INTERVAL)
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f'Error en ciclo principal: {e}')
                time.sleep(self.config.POLL_INTERVAL)

        self._print_stats()

    def poll_once(self):
        logger.info('Ejecutando una sola ronda de polling...')
        jobs = self.fetch_pending_jobs()
        if jobs:
            logger.info(f'Procesando {len(jobs)} trabajos pendientes')
            for job in jobs:
                self.process_job(job)
        else:
            logger.info('No hay trabajos pendientes')
        self._print_stats()

    def stop(self):
        self._running = False

    def _print_stats(self):
        logger.info(f'Estadísticas: {self._stats["processed"]} procesados, '
                    f'{self._stats["failed"]} fallidos, {self._stats["skipped"]} saltados')


def main():
    parser = argparse.ArgumentParser(description='AURON Print Bridge')
    parser.add_argument('--once', action='store_true', help='Procesar trabajos pendientes y salir')
    parser.add_argument('--verbose', action='store_true', help='Logging detallado')
    args = parser.parse_args()

    config = Config()
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info(f'AURON Print Bridge v1.0 — {"DEMO" if config.PRINTER_CONNECTION_TYPE == "dummy" else "PRODUCCIÓN"}')

    bridge = PrintBridge(config)

    if args.once:
        bridge.poll_once()
    else:
        try:
            bridge.poll_forever()
        except KeyboardInterrupt:
            logger.info('Deteniendo puente de impresión...')
            bridge.stop()

    logger.info('AURON Print Bridge finalizado')


if __name__ == '__main__':
    main()
