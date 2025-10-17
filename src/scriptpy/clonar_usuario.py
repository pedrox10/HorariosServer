import json
import sys
from zk import ZK

# --- Validación de argumentos ---
if len(sys.argv) < 4:
    print(json.dumps({
        "accion": "clonar",
        "success": False,
        "error": "Formato incorrecto. Uso: copiar_usuario.py <ip_origen> <ip_destino> <uid>"
    }))
    sys.exit(1)

ip_origen = sys.argv[1]
ip_destino = sys.argv[2]
uid = int(sys.argv[3])

def obtener_usuario_y_huellas(ip, uid):
    try:
        zk = ZK(ip, port=4370, timeout=10)
        conn = zk.connect()
        if not conn:
            raise Exception("can't reach device")

        usuarios = conn.get_users()
        usuario = next((u for u in usuarios if u.uid == uid), None)
        if not usuario:
            raise Exception("user_not_found")

        huellas = []
        for i in range(10):
            f = conn.get_user_template(uid=uid, temp_id=i)
            if f is not None:
                huellas.append(f)

        conn.disconnect()
        return usuario, huellas
    except Exception as e:
        raise Exception(f"[{ip}] {e}")

def clonar_usuario(origen, destino, uid):
    try:
        usuario, huellas = obtener_usuario_y_huellas(origen, uid)

        zk_dest = ZK(destino, port=4370, timeout=10)
        conn_dest = zk_dest.connect()
        if not conn_dest:
            raise Exception("can't reach destination")

        usuarios_dest = conn_dest.get_users()

        # Verificar si ya existe el usuario
        if any(u.user_id == usuario.user_id for u in usuarios_dest):
            conn_dest.disconnect()
            return {
                "accion": "clonar",
                "success": False,
                "error": f"El usuario '{usuario.user_id}' ya existe en el terminal destino",
                "excepcion": None
            }

        # Verificar huellas
        if not huellas:
            conn_dest.disconnect()
            return {
                "accion": "clonar",
                "success": False,
                "error": f"El usuario '{usuario.user_id}' no tiene huellas registradas en el terminal origen",
                "excepcion": None
            }

        # Buscar UID libre
        uids_usados = sorted([u.uid for u in usuarios_dest if isinstance(u.uid, int)])
        uid_libre = 1
        for uid_usado in uids_usados:
            if uid_usado == uid_libre:
                uid_libre += 1
            elif uid_usado > uid_libre:
                break

        # Crear usuario
        conn_dest.set_user(
            uid=uid_libre,
            name=usuario.name,
            privilege=usuario.privilege,
            password=usuario.password,
            group_id=usuario.group_id,
            user_id=usuario.user_id,
            card=usuario.card
        )

        # Obtener el usuario recién creado
        usuarios_actualizados = conn_dest.get_users()
        nuevo_usuario = next((u for u in usuarios_actualizados if u.uid == uid_libre), None)

        if not nuevo_usuario:
            raise Exception("user_not_created")

        # Copiar huellas
        for h in huellas:
            conn_dest.save_user_template(nuevo_usuario, [h])

        conn_dest.disconnect()
        return {
            "accion": "clonar",
            "success": True,
            "mensaje": f"Usuario '{usuario.user_id}' copiado correctamente de {origen} a {destino}"
        }

    except Exception as e:
        msg = str(e)
        # Mensajes amigables según tipo de error
        if "can't reach device" in msg:
            return {
                "accion": "clonar",
                "success": False,
                "error": f"No se pudo conectar al terminal origen ({origen})",
                "excepcion": msg
            }
        elif "can't reach destination" in msg:
            return {
                "accion": "clonar",
                "success": False,
                "error": f"No se pudo conectar al terminal destino ({destino})",
                "excepcion": msg
            }
        elif "user_not_found" in msg:
            return {
                "accion": "clonar",
                "success": False,
                "error": f"El usuario con UID {uid} no existe en el terminal origen",
                "excepcion": msg
            }
        else:
            return {
                "accion": "clonar",
                "success": False,
                "error": "Ocurrió un error al clonar el usuario",
                "excepcion": msg
            }

# --- Ejecución principal ---
try:
    resultado = clonar_usuario(ip_origen, ip_destino, uid)
    print(json.dumps(resultado))
except Exception as e:
    print(json.dumps({
        "accion": "clonar",
        "success": False,
        "error": "Error inesperado en la clonación",
        "excepcion": str(e)
    }))