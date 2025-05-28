import sys
from zk import ZK, const

# Leer parámetros
if len(sys.argv) < 3:
    print("Uso: python crear_usuario.py <ip> <puerto> <uid>")
    sys.exit(1)

ip = sys.argv[1]
puerto = int(sys.argv[2])
uid = int(sys.argv[3])
zk = ZK(ip, port=puerto, timeout=10, force_udp=False, ommit_ping=False)
try:
    conn = zk.connect()
    #conn.set_user(uid=212, name='JUAN PEREZ', privilege=const.USER_DEFAULT, password='', user_id='5907491')
    conn.delete_user(uid=212)
except Exception as e:
    print(f"Error al crear usuario: {str(e)}")
finally:
    if conn:
        conn.disconnect()