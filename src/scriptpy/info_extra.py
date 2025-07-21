from zk import ZK, const
import sys, getopt, json, datetime
# Parámetros de conexión
zk_ip = sys.argv[1] # Dirección IP de tu dispositivo ZKTeco +1 por piso
zk_port = int(sys.argv[2])     # Puerto por defecto de los dispositivos ZKTeco
timeout = 60        # Ti1
zk = ZK(zk_ip, port=zk_port, timeout=timeout)
try:
    conn = zk.connect()
    data = {
            "firmware_version": conn.get_firmware_version(),
            "serial_number": conn.get_serialnumber(),
            "platform": conn.get_platform(),
            "device_name": conn.get_device_name(),
            "face_version": conn.get_face_version(),
            "fp_version": conn.get_fp_version(),
            "extend_format": conn.get_extend_fmt(),
            "user_extend_format": conn.get_user_extend_fmt(),
            "face_function_on": conn.get_face_fun_on(),
            "compat_old_firmware": conn.get_compat_old_firmware(),
            "network_parameters": conn.get_network_params(),
            "mac_address": conn.get_mac()
            }
    print(json.dumps({"success": True, "info_capacidad": data}))
    conn.disconnect()
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))