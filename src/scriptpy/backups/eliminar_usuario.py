import sys
from zk import ZK, const

# Leer parámetros
if len(sys.argv) < 2:
    print(json.dumps({"success": False, "error": "Comando debe tener este formato: eliminar_usuario.py <ip> <uid>"}))
    sys.exit(1)

ip = sys.argv[1]
puerto = 4370
uid = int(sys.argv[2])
zk = ZK(ip, port=puerto, timeout=10)
try:
    conn = zk.connect()
    conn.delete_user(uid)
    print(json.dumps({"success": True, "mensaje": f"Usuario {uid} borrado de {ip} correctamente"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
finally:
    if conn:
        conn.disconnect()