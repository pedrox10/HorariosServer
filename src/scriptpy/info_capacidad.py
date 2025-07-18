from zk import ZK, const
import sys, getopt, json, datetime
# Parámetros de conexión
zk_ip = sys.argv[1] # Dirección IP de tu dispositivo ZKTeco +1 por piso
zk_port = int(sys.argv[2])     # Puerto por defecto de los dispositivos ZKTeco
timeout = 60        # Ti1
zk = ZK(zk_ip, port=zk_port, timeout=timeout)
try:
    conn = zk.connect()
    conn.read_sizes()
    data = {
            "users": conn.users,
            "users_cap": conn.users_cap,
            "fingers": conn.users,
            "fingers_cap": conn.users_cap,
            "records": conn.users,
            "records_cap": conn.users_cap,
            "faces": conn.users,
            "faces_cap": conn.users_cap
            }
    print(json.dumps(data))
    conn.disconnect()
except Exception as e:
    print(f"Error: {e}")