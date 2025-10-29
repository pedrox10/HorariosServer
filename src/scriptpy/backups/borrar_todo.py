from zk import ZK, const
import sys, json, datetime

# Parámetros de conexión
zk_ip = sys.argv[1]  # Dirección IP del dispositivo ZKTeco
zk_port = int(sys.argv[2])  # Puerto del dispositivo (normalmente 4370)
timeout = 60

zk = ZK(zk_ip, port=zk_port, timeout=timeout)
try:
    conn = zk.connect()
    usuarios = conn.get_users()
    huellas = conn.get_templates()

    # Guardar en un JSON
    import json
    backup = {
        "usuarios": [u.__dict__ for u in usuarios],
        "huellas": [t.json_pack() for t in huellas]
    }
    with open("backup.json", "w", encoding="utf8") as f:
        json.dump(backup, f, indent=2, ensure_ascii=False)
    # Ejecutar borrado de todos los datos del dispositivo
    conn.clear_data()
    data = {
        "success": True,
        "mensaje": "Todos los datos borrados correctamente",
    }
    print(json.dumps(data))
    conn.disconnect()
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))