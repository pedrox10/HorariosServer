import sys
import json
from zk import ZK

# --- Validación de argumentos ---
if len(sys.argv) < 3:
    print(json.dumps({
        "exito": False,
        "tipo": "is-danger",
        "mensaje": "Formato incorrecto. Uso: leer_usuario.py <ip_terminal> <uid>"
    }))
    sys.exit(0)

ip_terminal = sys.argv[1]
uid = int(sys.argv[2])
esperado = sys.argv[3]

def leer_usuario_desde_biometrico(ip, uid, esperado=None):
    zk = ZK(ip, port=4370, timeout=10)
    conn = None
    try:
        conn = zk.connect()
        if not conn:
            raise Exception(f"can't reach device ({ip})")

        usuarios = conn.get_users()
        usuario = next((u for u in usuarios if u.uid == uid), None)

        if not usuario:
            raise Exception("user_not_found")

        if esperado and usuario.user_id.strip() != esperado.strip():
            raise Exception(f"uid_reutilizado:{usuario.user_id}")

        return {
            "exito": True,
            "tipo": "is-success",
            "mensaje": f"Funcionario leído correctamente del terminal {ip}.",
            "user_id": usuario.user_id,
            "nombre": usuario.name,
            "privilegio": usuario.privilege
        }

    except Exception as e:
        msg = str(e)

        # --- Manejo de excepciones conocidas ---
        if "can't reach device" in msg or "Connection failure" in msg:
            return {
                "exito": False,
                "tipo": "is-danger",
                "mensaje": f"No se pudo conectar al terminal ({ip}).",
                "excepcion": msg
            }
        elif "user_not_found" in msg:
            return {
                "exito": False,
                "tipo": "is-danger",
                "mensaje": f"El funcionario con UID {uid} ya no existe en el terminal.",
                "excepcion": msg
            }
        elif "uid_reutilizado" in msg:
            user_id_real = msg.split(":")[1] if ":" in msg else "desconocido"
            return {
                "exito": False,
                "tipo": "is-danger",
                "mensaje": f"El UID {uid} fue reasignado a otro funcionario ({user_id_real}).",
                "excepcion": msg
            }
        else:
            return {
                "exito": False,
                "tipo": "is-danger",
                "mensaje": "Ocurrió un error inesperado al leer el funcionario.",
                "excepcion": msg
            }
    finally:
        if conn:
            conn.disconnect()

# --- Ejecución principal ---
resultado = leer_usuario_desde_biometrico(ip_terminal, uid, esperado)
print(json.dumps(resultado))
sys.exit(0)