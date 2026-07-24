#!/bin/bash
# AURON Print Bridge — Iniciar / Detener / Estado
# Uso: ./bridge.sh {start|stop|status|restart|once|logs}

cd "$(dirname "$0")"
VENV="$PWD/venv"
SERVICE="auron-bridge.service"

case "${1:-status}" in
  start)
    echo "Iniciando AURON Print Bridge..."
    sudo cp auron-bridge.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE"
    sudo systemctl start "$SERVICE"
    sudo systemctl status "$SERVICE" --no-pager
    ;;
  stop)
    sudo systemctl stop "$SERVICE"
    echo "Detenido."
    ;;
  restart)
    sudo systemctl restart "$SERVICE"
    sudo systemctl status "$SERVICE" --no-pager
    ;;
  status)
    if systemctl is-active --quiet "$SERVICE" 2>/dev/null; then
      echo "● AURON Bridge activo"
      sudo systemctl status "$SERVICE" --no-pager 2>&1 | head -15
    else
      echo "○ AURON Bridge detenido"
    fi
    ;;
  once)
    echo "Procesando trabajos pendientes (una vez)..."
    source "$VENV/bin/activate"
    timeout 30 python main.py --once
    ;;
  logs)
    sudo journalctl -u "$SERVICE" -n 50 -f
    ;;
  *)
    echo "Uso: $0 {start|stop|status|restart|once|logs}"
    exit 1
    ;;
esac
