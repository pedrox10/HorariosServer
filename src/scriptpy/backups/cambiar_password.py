import sys
import json
from zk import ZK

# Uso: cambiar_password_biometrico.py <ip_terminal> <uid> <nuevo_password>
if len(sys.argv) != 4:
    print(json.dumps({
        "accion": "cambiar_password",
        "exito": False,
        "mensaje": "Uso: cambiar_password_biometrico.py <ip_terminal> <uid> <nuevo_password>"
    }))
    sys.exit(0)

ip = sys.argv[1]
uid = int(sys.argv[2])
nuevo_password = sys.argv[3]

def cambiar_password(ip_terminal, uid, password):
    zk = ZK(ip_terminal, port=4370, timeout=10)
    conn = None
    try:
        conn = zk.connect()
        if not conn:
            raise Exception("no_connection")

        usuarios = conn.get_users()
        usuario = next((u for u in usuarios if u.uid == uid), None)

        if not usuario:
            raise Exception("user_not_found")

        conn.set_user(
            uid=usuario.uid,
            name=usuario.name,
            privilege=usuario.privilege,
            password=password,
            group_id=usuario.group_id,
            user_id=usuario.user_id,
            card=usuario.card
        )

        return {
            "accion": "cambiar_password",
            "exito": True,
            "mensaje": f"Password actualizado correctamente para UID {uid}"
        }

    except Exception as e:
        msg = str(e)
        if msg == "no_connection":
            return {
                "accion": "cambiar_password",
                "exito": False,
                "mensaje": f"No se pudo conectar al terminal {ip_terminal}"
            }
        if msg == "user_not_found":
            return {
                "accion": "cambiar_password",
                "exito": False,
                "mensaje": f"El UID {uid} no existe en el terminal"
            }

        return {
            "accion": "cambiar_password",
            "exito": False,
            "mensaje": "Error inesperado",
            "detalle": msg
        }
    finally:
        if conn:
            conn.disconnect()

resultado = cambiar_password(ip, uid, nuevo_password)
print(json.dumps(resultado))
sys.exit(0)