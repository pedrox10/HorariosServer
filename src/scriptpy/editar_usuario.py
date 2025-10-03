from zk import ZK, const

ip_terminal = "192.168.200.3"
puerto = 4370
ci_antiguo = "7881365"  # CI actual
ci_nuevo = "7881369"    # CI nuevo

zk = ZK(ip_terminal, port=puerto, timeout=5)
conn = None

try:
    conn = zk.connect()
    conn.disable_device()
    # Obtener el usuario antiguo
    usuarios = conn.get_users()
    usuario = next((u for u in usuarios if u.user_id == ci_antiguo), None)

    if not usuario:
        print(f"No se encontró usuario con CI {ci_antiguo}")
    else:
        print(f"Clonando usuario {usuario.name} con nuevo CI {ci_nuevo}...")
        # Crear nuevo usuario con los mismos datos
        conn.set_user(uid=215, name=usuario.name, privilege=usuario.privilege, password='', group_id='', user_id='7881369', card=0)
        # Copiar huellas
        for fid in range(10):  # Hasta 10 huellas por usuario
            plantilla = conn.get_user_template(int(ci_antiguo), fid)
            if plantilla:
                conn.set_user_template(int(ci_nuevo), fid, plantilla)
        # Eliminar el usuario antiguo
        conn.delete_user(user_id='7881365')
        print(f"CI cambiado de {ci_antiguo} a {ci_nuevo} con éxito")

    conn.enable_device()

except Exception as e:
    print("Error:", e)
finally:
    if conn:
        conn.disconnect()