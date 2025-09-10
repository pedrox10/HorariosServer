from zk import ZK, const
import sys, json, datetime

# Parámetros de conexión
zk_ip = sys.argv[1]  # Dirección IP del dispositivo ZKTeco
zk_port = int(sys.argv[2])  # Puerto del dispositivo (normalmente 4370)
timeout = 60

zk = ZK(zk_ip, port=zk_port, timeout=timeout)
try:
    conn = zk.connect()
    # Ejecutar limpieza de asistencias
    conn.clear_attendance()
    # Verificar que se borraron
    records = conn.get_attendance()
    data = {
        "success": True,
        "mensaje": "Asistencias borradas correctamente",
        "marcaciones_restantes": len(records)
    }
    print(json.dumps(data))
    conn.disconnect()
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))