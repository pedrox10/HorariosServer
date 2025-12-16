from zk import ZK
import sys, json

zk_ip = sys.argv[1]
zk_port = 4370
timeout = 30

zk = ZK(zk_ip, port=zk_port, timeout=timeout)

resultado = {
    "usuarios": []
}

try:
    conn = zk.connect()
    users = conn.get_users()

    for user in users:
        huellas = []

        for fid in range(10):
            try:
                tpl = conn.get_user_template(uid=user.uid, temp_id=fid)
                if tpl and tpl.template and tpl.valid == 1:
                    huellas.append({
                        "fid": fid,
                        "size": tpl.size,
                        "valid": tpl.valid,
                        "template": tpl.template.hex()
                    })
            except Exception:
                continue  # huella inexistente o error del equipo

        # ⚠️ Si NO quieres respaldar usuarios sin huellas:
        if len(huellas) == 0:
            continue

        resultado["usuarios"].append({
            "uid": user.uid,
            "user_id": user.user_id,
            "name": user.name,
            "privilege": user.privilege,
            "group_id": user.group_id,
            "huellas": huellas
        })

    conn.disconnect()
    print(json.dumps(resultado, indent=2))

except Exception as e:
    print(json.dumps({"error": str(e)}))
