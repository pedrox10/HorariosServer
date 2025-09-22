import json
import sys
import datetime
from zk import ZK

# Leemos parámetros
if len(sys.argv) < 4:
    print(json.dumps({"error": "Uso: python cambiar_fecha.py <ip> <puerto> <fecha_hora_iso>"}))
    sys.exit(1)

ip = sys.argv[1]
port = int(sys.argv[2])
date_time_iso = sys.argv[3] # Expected format: YYYY-MM-DDTHH:MM:SS

zk = ZK(ip, port=port, timeout=10)
try:
    # Convertimos iso string a objecto fecha, asumimos zona horaria correcta
    new_datetime = datetime.datetime.fromisoformat(date_time_iso)
    formatted_datetime = new_datetime.strftime("%d/%m/%Y %H:%M:%S")
    conn = zk.connect()
    if conn:
        conn.set_time(new_datetime)
        conn.disconnect()
        print(json.dumps({"success": True, "mensaje": f"Fecha y hora actualizadas: {formatted_datetime}"}))
    else:
        print(json.dumps({"success": False, "error": "No se pudo conectar al dispositivo"}))
except ValueError:
    print(json.dumps({"success": False, "error": "Formato de fecha y hora ISO inválido. Use YYYY-MM-DDTHH:MM:SS"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))