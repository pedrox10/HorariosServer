from zk import ZK
import sys, json

# Parámetros de conexión
zk_ip = sys.argv[1]  # Dirección IP del dispositivo ZKTeco
zk_port = int(sys.argv[2])  # Puerto del dispositivo (normalmente 4370)
timeout = 60

zk = ZK(zk_ip, port=zk_port, timeout=timeout)
try:
    conn = zk.connect()
    # Ejecutar reinicio del dispositivo
    conn.restart()
    data = {
        "success": True,
        "mensaje": "El dispositivo se reinició correctamente"
    }
    print(json.dumps(data))
    conn.disconnect()
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
