import json
import sys
from zk import ZK

# --- Validación de argumentos ---
if len(sys.argv) < 4:
    print(json.dumps({"success": False, "error": "Uso: python copiar_usuario.py <ip_origen> <ip_destino> <uid>"}))
    sys.exit(1)

ip_origen = sys.argv[1]
ip_destino = sys.argv[2]
uid = int(sys.argv[3])

def obtener_usuario_y_huellas(ip, uid):
    zk = ZK(ip, port=4370, timeout=10)
    conn = zk.connect()
    if not conn:
        raise Exception(f"No se pudo conectar al terminal {ip}")

    # Buscar el usuario
    usuarios = conn.get_users()
    usuario = next((u for u in usuarios if u.uid == uid), None)
    if not usuario:
        conn.disconnect()
        raise Exception(f"Usuario con UID {uid} no encontrado en {ip}")

    # Obtener huellas (hasta 10 dedos: 0-9)
    huellas = []
    for i in range(10):
        f = conn.get_user_template(uid=uid, temp_id=i)
        if f is not None:
            huellas.append(f)

    conn.disconnect()
    return usuario, huellas


def clonar_usuario(origen, destino, uid):
    usuario, huellas = obtener_usuario_y_huellas(origen, uid)

    zk_dest = ZK(destino, port=4370, timeout=10)
    conn_dest = zk_dest.connect()
    if not conn_dest:
        raise Exception(f"No se pudo conectar al terminal destino {destino}")

    # Crear usuario
    conn_dest.set_user(
        uid=None,
        name=usuario.name,
        privilege=usuario.privilege,
        password=usuario.password,
        group_id=usuario.group_id,
        user_id=usuario.user_id,
        card=usuario.card
    )
    # Copiar huellas
    conn_dest.save_user_template(usuario, huellas)

    conn_dest.disconnect()
    return True

try:
    clonar_usuario(ip_origen, ip_destino, uid)
    print(json.dumps({"success": True, "mensaje": f"Usuario {uid} copiado de {ip_origen} a {ip_destino}"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))