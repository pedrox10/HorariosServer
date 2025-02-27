import json
import sys
from zk import ZK

# Configuración del dispositivo
ip = sys.argv[1]  # IP del dispositivo
port = int(sys.argv[2]) if len(sys.argv) > 2 else 4370
zk = ZK(ip, port)
conn = zk.connect()
if conn:
    device_info = {
        "CurrentTime": str(conn.get_time()),
        "FirmwareVersion": conn.get_firmware_version(),
        "DeviceName": conn.get_device_name(),
        "SerialNumber": conn.get_serialnumber(),
        "numMarcaciones": len(conn.get_attendance())
    }
    conn.disconnect()
    # Convertir a JSON e imprimir
    print(json.dumps(device_info, indent=4))
else:
    print(json.dumps({"error": "No se pudo conectar al dispositivo"}))