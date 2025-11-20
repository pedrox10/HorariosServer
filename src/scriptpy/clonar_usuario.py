import json
import sys
from zk import ZK

# --- Validación de argumentos ---
if len(sys.argv) < 4:
    print(json.dumps({
        "accion": "clonar",
        "exito": False,
        "tipo": "is-warning",
        "mensaje": "Comando incorrecto, falla en los parámetros enviados"
    }))
    sys.exit(0)

ip_origen = sys.argv[1]
ip_destino = sys.argv[2]
uid = int(sys.argv[3])
user_id_esperado = sys.argv[4]

# --- Función para obtener usuario y huellas desde el terminal origen ---
def obtener_usuario_y_huellas(ip, uid, user_id_esperado):
    try:
        zk = ZK(ip, port=4370, timeout=10)
        conn = zk.connect()
        if not conn:
            raise Exception(f"can't reach device origen (ping {ip})")

        usuarios = conn.get_users()
        usuario = next((u for u in usuarios if u.uid == uid), None)
        if not usuario:
            raise Exception("user_not_found")

        # --- Validar si el UID pertenece al funcionario esperado ---
        if str(usuario.user_id).strip() != str(user_id_esperado).strip():
            raise Exception(f"uid_reasignado: El UID {uid} pertenece a otro usuario ({usuario.user_id})")

        # Obtener huellas
        huellas = []
        for i in range(10):
            f = conn.get_user_template(uid=uid, temp_id=i)
            if f is not None:
                huellas.append(f)

        conn.disconnect()
        return usuario, huellas

    except Exception as e:
        raise Exception(f"{e}")

# --- Función principal de clonación ---
def clonar_usuario(origen, destino, uid, user_id_esperado):
    try:
        # Conectarse y leer desde origen
        usuario, huellas = obtener_usuario_y_huellas(origen, uid, user_id_esperado)

        # Conectarse al destino
        zk_dest = ZK(destino, port=4370, timeout=10)
        conn_dest = zk_dest.connect()
        if not conn_dest:
            raise Exception(f"can't reach device destino (ping {destino})")

        usuarios_dest = conn_dest.get_users()

        # Verificar si el usuario ya existe
        if any(u.user_id == usuario.user_id for u in usuarios_dest):
            conn_dest.disconnect()
            return {
                "accion": "clonar",
                "exito": False,
                "tipo": "is-warning",
                "mensaje": f"El usuario '{usuario.user_id}' ya existe en el terminal destino",
                "excepcion": None
            }

        # Verificar si tiene huellas
        if not huellas:
            conn_dest.disconnect()
            return {
                "accion": "clonar",
                "exito": False,
                "tipo": "is-warning",
                "mensaje": f"El usuario '{usuario.user_id}' no tiene huellas registradas en el terminal origen",
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

        # Crear usuario en destino
        conn_dest.set_user(
            uid=uid_libre,
            name=usuario.name,
            privilege=usuario.privilege,
            password=usuario.password,
            group_id=usuario.group_id,
            user_id=usuario.user_id,
            card=usuario.card
        )

        # Buscar el usuario recién creado
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
            "exito": True,
            "tipo": "is-success",
            "mensaje": f"Usuario '{usuario.user_id}' clonado correctamente en destino"
        }

    except Exception as e:
        msg = str(e)
        # --- Switch/Match para los tipos de error ---
        match True:
            case _ if "uid_reasignado" in msg:
                return {
                    "accion": "clonar",
                    "exito": False,
                    "tipo": "is-warning",
                    "mensaje": f"El UID {uid} fue reasignado a otro funcionario en el terminal origen",
                    "excepcion": msg
                }

            case _ if "can't reach device" in msg and ip_origen in msg:
                return {
                    "accion": "clonar",
                    "exito": False,
                    "tipo": "is-warning",
                    "mensaje": f"No se pudo conectar al terminal origen ({origen})",
                    "excepcion": msg
                }

            case _ if "can't reach device" in msg and ip_destino in msg:
                return {
                    "accion": "clonar",
                    "exito": False,
                    "tipo": "is-warning",
                    "mensaje": f"No se pudo conectar al terminal destino ({destino})",
                    "excepcion": msg
                }

            case _ if "user_not_found" in msg:
                return {
                    "accion": "clonar",
                    "exito": False,
                    "tipo": "is-warning",
                    "mensaje": f"El usuario con UID {uid} no existe en el terminal origen",
                    "excepcion": msg
                }

            case _ if "user_not_created" in msg:
                return {
                    "accion": "clonar",
                    "exito": False,
                    "tipo": "is-danger",
                    "mensaje": "No se pudo verificar la creación del usuario en el terminal destino",
                    "excepcion": msg
                }

            case _:
                return {
                    "accion": "clonar",
                    "exito": False,
                    "tipo": "is-danger",
                    "mensaje": "Ocurrió un error inesperado al clonar el usuario",
                    "excepcion": msg
                }

# --- Ejecución principal ---
try:
    resultado = clonar_usuario(ip_origen, ip_destino, uid, user_id_esperado)
    print(json.dumps(resultado))
except Exception as e:
    print(json.dumps({
        "accion": "clonar",
        "exito": False,
        "tipo": "is-danger",
        "mensaje": "Error general en la clonación",
        "excepcion": str(e)
    }))
