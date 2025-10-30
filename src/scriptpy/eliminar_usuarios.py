import sys
import json
from zk import ZK

# --- Validación de argumentos (Mantiene el formato de error simple) ---
if len(sys.argv) < 3:
    # Error de uso (Crítico, pero diferente del error ZK)
    print(json.dumps({
        "success": False,
        "tipo": "is-danger",
        "mensaje": "Uso incorrecto. Formato: eliminar_usuarios.py <ip_terminal> <uids>",
        "excepcion": "Argumentos faltantes"
    }))
    sys.exit(0) # Termina limpiamente (código 0) para no romper el proceso padre

ip = sys.argv[1]
uids = [int(u) for u in sys.argv[2].split(",")]

# --- Función principal de eliminación ---
def eliminar_usuarios_del_terminal(ip_terminal, uids_a_eliminar):
    zk = ZK(ip_terminal, port=4370, timeout=10)
    conn = None
    resultados_individuales = []

    try:
        conn = zk.connect()
        if not conn:
            # Lanza una excepción específica si la conexión falla (capturada abajo)
            raise Exception(f"Connection failure: can't reach device ({ip_terminal})")

        # 1. Obtener lista actual de usuarios
        usuarios = conn.get_users()
        uids_existentes = {u.uid: u for u in usuarios}

        # 2. Iterar y eliminar cada UID
        for uid in uids_a_eliminar:
            usuario = uids_existentes.get(uid)

            if not usuario:
                resultados_individuales.append({
                    "uid": uid,
                    "nombre": f"UID {uid}",
                    "success": False,
                    "mensaje": "No existe en el terminal"
                })
                continue

            try:
                # conn.delete_user(uid=uid) # Descomentar para eliminación real
                resultados_individuales.append({
                    "uid": uid,
                    "nombre": usuario.name or f"UID {uid}",
                    "success": True,
                    "mensaje": "Eliminado correctamente"
                })

            except Exception as e:
                # Error en la eliminación de un usuario específico
                resultados_individuales.append({
                    "uid": uid,
                    "nombre": usuario.name or f"UID {uid}",
                    "success": False,
                    "mensaje": f"Error al intentar eliminar: {str(e)}"
                })

        # --- CASO 1: ÉXITO GENERAL (Devuelve el formato con 'resultados' encapsulado) ---
        return {
            "success": True,
            "tipo": "is-success",
            "resultados": resultados_individuales,
            "mensaje": "Proceso de eliminación ejecutado correctamente, más detalles en el reporte de eliminación."
        }

    except Exception as e:
        msg = str(e)

        # --- CASO 2: ERROR CRÍTICO ESPECÍFICO (Fallo de conexión) ---
        if "Connection failure" in msg or "can't reach device" in msg:
            return {
                "success": False,
                "tipo": "is-warning",
                "mensaje": f"Terminal sin conexión ({ip_terminal}).",
                "excepcion": msg
            }

        # --- CASO 3: ERROR CRÍTICO GENÉRICO ---
        return {
            "success": False,
            "tipo": "is-danger",
            "mensaje": "Ocurrió un error genérico inesperado durante la ejecución.",
            "excepcion": msg
        }

    finally:
        if conn:
            conn.disconnect()

# --- Ejecución principal ---
resultado_final = eliminar_usuarios_del_terminal(ip, uids)
print(json.dumps(resultado_final))
sys.exit(0) # Siempre termina limpiamente