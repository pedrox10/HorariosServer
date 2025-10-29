import sys
import json
from zk import ZK

if len(sys.argv) < 3:
    print(json.dumps({
        "success": False,
        "error": "Uso incorrecto. Formato: eliminar_usuarios.py <ip_terminal> <uids>"
    }))
    sys.exit(1)

ip = sys.argv[1]
uids = [int(u) for u in sys.argv[2].split(",")]
zk = ZK(ip, port=4370, timeout=10)
resultados = []
try:
    conn = zk.connect()
    if not conn:
        raise Exception("can't reach device")
    usuarios = conn.get_users()
    uids_existentes = {u.uid: u for u in usuarios}
    for uid in uids:
        try:
            usuario = uids_existentes.get(uid)
            if not usuario:
                resultados.append({
                    "uid": uid,
                    "nombre": f"UID {uid}",
                    "success": False,
                    "mensaje": "No existe en el terminal"
                })
                continue

            #conn.delete_user(uid=uid)
            resultados.append({
                "uid": uid,
                "nombre": usuario.name or f"UID {uid}",
                "success": True,
                "mensaje": "Eliminado correctamente"
            })

        except Exception as e:
            resultados.append({
                "uid": uid,
                "nombre": usuario.name if usuario else f"UID {uid}",
                "success": False,
                "mensaje": str(e)
            })

    conn.disconnect()

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": f"No se pudo conectar al terminal ({ip})",
        "excepcion": str(e)
    }))
    sys.exit(1)
# Salida final en formato JSON
print(json.dumps(resultados))