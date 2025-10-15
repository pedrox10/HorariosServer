from zk import ZK, const
import sys, getopt, json, datetime
# Parámetros de conexión
zk_ip = sys.argv[1] # Dirección IP de tu dispositivo ZKTeco +1 por piso
zk_port = int(sys.argv[2])     # Puerto por defecto de los dispositivos ZKTeco
timeout = 60        # Ti1
zk = ZK(zk_ip, port=zk_port, timeout=timeout)
try:
    conn_dest = zk.connect()
    usuarios_dest = conn_dest.get_users()
    uids_usados = sorted([u.uid for u in usuarios_dest if isinstance(u.uid, int)])
    uid_libre = 1
    for uid in uids_usados:
        if uid == uid_libre:
            uid_libre += 1
        elif uid > uid_libre:
            break
    print(json.dumps({"success": True, "uid_libre": uid_libre,}))
    conn_dest.disconnect()
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
