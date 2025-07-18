from zk import ZK, const
import sys, getopt, json, datetime
# Parámetros de conexión
zk_ip = sys.argv[1] # Dirección IP de tu dispositivo ZKTeco +1 por piso
zk_port = int(sys.argv[2])     # Puerto por defecto de los dispositivos ZKTeco
timeout = 60        # Ti1
zk = ZK(zk_ip, port=zk_port, timeout=timeout)
try:
    conn = zk.connect()
    print("Firmware Version:", conn.get_firmware_version())
    print("Serial Number:", conn.get_serialnumber())
    print("Platform:", conn.get_platform())
    print("Device Name:", conn.get_device_name())
    print("Face Version:", conn.get_face_version())
    print("FP Version:", conn.get_fp_version())
    print("Extend Format:", conn.get_extend_fmt())
    print("User Extend Format:", conn.get_user_extend_fmt())
    print("Face Function On:", conn.get_face_fun_on())
    print("Compat Old Firmware:", conn.get_compat_old_firmware())
    print("Network Parameters:", conn.get_network_params())
    print("MAC Address:", conn.get_mac())
    print("PIN Width:", conn.get_pin_width())
    conn.disconnect()
except Exception as e:
    print(f"Error: {e}")