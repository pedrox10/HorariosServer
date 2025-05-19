import sys
from zk import ZK, const

# Leer parámetros
if len(sys.argv) < 3:
    print("Uso: python enrollar_usuario.py <ip> <puerto> <uid>")
    sys.exit(1)

ip = sys.argv[1]
puerto = int(sys.argv[2])
uid = int(sys.argv[3])
zk = ZK(ip, port=puerto, timeout=10, force_udp=False, ommit_ping=False)
try:
    conn = zk.connect()
    print(f"Conectado a {ip}")
    # Enrollar huella digital para el UID
    print(f"Iniciando enrolamiento para UID {uid}... Coloque el dedo en el sensor")
    zk.enroll_user(uid=211, temp_id=0, user_id='5907490')
    print("Huella digital enrolada correctamente")
    conn.disconnect()
except Exception as e:
    print(f"Error al enrolar usuario: {str(e)}")