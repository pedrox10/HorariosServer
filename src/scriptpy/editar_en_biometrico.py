import sys
import json
from zk import ZK

# --- Validación de argumentos ---
# Uso: editar_en_biometrico.py <ip_terminal> <uid> <nuevo_nombre> <nuevo_rol> [<user_id_esperado>]
if len(sys.argv) < 5:
    print(json.dumps({
        "accion": "editar_en_biometrico",
        "exito": False,
        "tipo": "is-danger",
        "mensaje": "Uso incorrecto. Formato: editar_en_biometrico.py <ip_terminal> <uid> <nuevo_nombre> <nuevo_rol> [<user_id_esperado>]",
        "excepcion": "Argumentos faltantes"
    }))
    sys.exit(0)

ip = sys.argv[1]
uid = int(sys.argv[2])
nuevo_nombre = sys.argv[3]
nuevo_rol = int(sys.argv[4])  # 0 = usuario normal, 14 = admin
user_id_esperado = sys.argv[5]

def editar_usuario_en_biometrico(ip_terminal, uid, nuevo_nombre, nuevo_rol, esperado):
    zk = ZK(ip_terminal, port=4370, timeout=10)
    conn = None
    try:
        conn = zk.connect()
        if not conn:
            raise Exception(f"can't reach device ({ip_terminal})")

        usuarios = conn.get_users()
        usuario = next((u for u in usuarios if u.uid == uid), None)

        if not usuario:
            raise Exception("user_not_found")

        if esperado and usuario.user_id.strip() != esperado.strip():
            raise Exception(f"uid_reutilizado:{usuario.user_id}")

        # Aplicar edición
        conn.set_user(
            uid=uid,
            name=nuevo_nombre,
            privilege=nuevo_rol,
            password=usuario.password,
            group_id=usuario.group_id,
            user_id=usuario.user_id,
            card=usuario.card
        )

        return {
            "accion": "editar_en_biometrico",
            "exito": True,
            "tipo": "is-success",
            "mensaje": f"Funcionario '{usuario.user_id}' actualizado correctamente en el biométrico ({ip_terminal})."
        }

    except Exception as e:
        msg = str(e)
        if msg.startswith("uid_reutilizado:"):
            return {
                "accion": "editar_en_biometrico",
                "exito": False,
                "tipo": "is-warning",
                "mensaje": f"UID {uid} pertenece ahora a otro usuario ({msg.split(':')[1]}). No se editó.",
                "excepcion": msg
            }
        if "can't reach device" in msg:
            return {
                "accion": "editar_en_biometrico",
                "exito": False,
                "tipo": "is-warning",
                "mensaje": f"No se pudo conectar al terminal ({ip_terminal}).",
                "excepcion": msg
            }
        if "user_not_found" in msg:
            return {
                "accion": "editar_en_biometrico",
                "exito": False,
                "tipo": "is-warning",
                "mensaje": f"El usuario con UID {uid} no existe en el terminal.",
                "excepcion": msg
            }

        return {
            "accion": "editar_en_biometrico",
            "exito": False,
            "tipo": "is-danger",
            "mensaje": "Ocurrió un error inesperado al editar el usuario.",
            "excepcion": msg
        }
    finally:
        if conn:
            conn.disconnect()

try:
    resultado = editar_usuario_en_biometrico(ip, uid, nuevo_nombre, nuevo_rol, user_id_esperado)
    print(json.dumps(resultado))
except Exception as e:
    print(json.dumps({
        "accion": "editar_en_biometrico",
        "exito": False,
        "tipo": "is-danger",
        "mensaje": "Error crítico fuera de la función principal.",
        "excepcion": str(e)
    }))
sys.exit(0)
