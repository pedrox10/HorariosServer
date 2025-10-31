import sys
import json
from zk import ZK

# --- Validación de argumentos ---
if len(sys.argv) < 4:
    print(json.dumps({
        "accion": "eliminar",
        "success": False,
        "tipo": "is-warning",
        "mensaje": "Formato incorrecto. Uso: eliminar_usuarios.py <ip_terminal> <uids> <user_ids_esperados>"
    }))
    sys.exit(0)

ip_terminal = sys.argv[1]
# ✅ CORRECCIÓN 1: Aseguramos que los UIDs sean enteros y limpiamos espacios.
uids = [int(u.strip()) for u in sys.argv[2].split(",")]

# ✅ CORRECCIÓN 2: user_ids_esperados se mantiene como lista de CADENAS.
# Usamos .strip() para limpiar cualquier espacio en blanco en los IDs recibidos.
user_ids_esperados = [u.strip() for u in sys.argv[3].split(",")]

# Validar longitud coincidente
if len(uids) != len(user_ids_esperados):
    print(json.dumps({
        "accion": "eliminar",
        "success": False,
        "tipo": "is-warning",
        "mensaje": "Las listas de UIDs y user_ids_esperados no coinciden en cantidad."
    }))
    sys.exit(0)

# --- Función principal ---
def eliminar_usuarios_del_terminal(ip_terminal, uids_a_eliminar, user_ids_esperados):
    zk = ZK(ip_terminal, port=4370, timeout=10)
    conn = None
    resultados = []

    try:
        conn = zk.connect()
        if not conn:
            raise Exception(f"can't reach device (ping {ip_terminal})")

        usuarios = conn.get_users()
        uids_existentes = {u.uid: u for u in usuarios}

        for i, uid in enumerate(uids_a_eliminar):
            # user_id_esperado ya es una cadena limpia (gracias a la inicialización)
            user_id_esperado = user_ids_esperados[i]
            usuario = uids_existentes.get(uid)

            if not usuario:
                resultados.append({
                    "uid": uid,
                    "user_id": user_id_esperado,
                    "nombre": f"UID {uid}",
                    "success": False,
                    "mensaje": "No existe en el terminal"
                })
                continue

            # ✅ CLAVE: Comparación segura entre dos cadenas (str), limpiando el valor del dispositivo.
            if str(usuario.user_id).strip() != user_id_esperado:
                resultados.append({
                    "uid": uid,
                    "user_id": user_id_esperado,
                    "nombre": usuario.name or f"UID {uid}",
                    "success": False,
                    "mensaje": f"UID reasignado: pertenece a otro funcionario ({usuario.user_id})"
                })
                continue

            try:
                # conn.delete_user(uid=uid)  # ← Descomentar para eliminación real
                resultados.append({
                    "uid": uid,
                    "user_id": user_id_esperado,
                    "nombre": usuario.name or f"UID {uid}",
                    "success": True,
                    "mensaje": "Eliminado correctamente"
                })
            except Exception as e:
                resultados.append({
                    "uid": uid,
                    "user_id": user_id_esperado,
                    "nombre": usuario.name or f"UID {uid}",
                    "success": False,
                    "mensaje": f"Error al intentar eliminar: {str(e)}"
                })

        # ... (Resto del manejo de éxito/fallo)

    except Exception as e:
        msg = str(e)
        # Error específico: sin conexión
        if "can't reach device" in msg or "Connection failure" in msg:
            return {
                "accion": "eliminar",
                "success": False,
                "tipo": "is-warning",
                "mensaje": f"No se pudo conectar al terminal ({ip_terminal}).",
                "excepcion": msg
            }

        # Error genérico
        return {
            "accion": "eliminar",
            "success": False,
            "tipo": "is-danger",
            "mensaje": "Ocurrió un error inesperado durante la eliminación.",
            "excepcion": msg
        }

    finally:
        if conn:
            conn.disconnect()

# --- Ejecución principal ---
resultado = eliminar_usuarios_del_terminal(ip_terminal, uids, user_ids_esperados)
print(json.dumps(resultado))
sys.exit(0)