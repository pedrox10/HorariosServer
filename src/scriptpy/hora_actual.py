from zk import ZK, const
import sys, getopt, json, datetime
# Parámetros de conexión
zk_ip = sys.argv[1] # Dirección IP de tu dispositivo ZKTeco +1 por piso
zk_port = int(sys.argv[2])     # Puerto por defecto de los dispositivos ZKTeco
timeout = 60        # Ti1
zk = ZK(zk_ip, port=zk_port, timeout=timeout)
def serialize_datetime(obj):
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    raise TypeError("Type not serializable")
try:
    conn = zk.connect()
    print(json.dumps({"success": True, "hora_actual": serialize_datetime(conn.get_time())}))
    conn.disconnect()
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
