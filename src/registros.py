from zk import ZK, const
import sys, getopt, json, datetime
# Parámetros de conexión
zk_ip = sys.argv[1]  # Dirección IP de tu dispositivo ZKTeco +1 por piso
zk_port = 4370            # Puerto por defecto de los dispositivos ZKTeco
timeout = 10              # Tiempo de espera para la conexión

zk = ZK(zk_ip, port=zk_port, timeout=timeout)
# Define a custom function to serialize datetime objects 
def serialize_datetime(obj): 
    if isinstance(obj, datetime.datetime): 
        return obj.isoformat() 
    raise TypeError("Type not serializable") 
try:
    # Conectar al dispositivo
    conn = zk.connect()

    # Obtener y mostrar los registros de asistencia
    attendance_records = conn.get_attendance()
    aux = []
    for record in attendance_records:
        data = {
        "user_id": record.user_id,
        "timestamp": serialize_datetime(record.timestamp)
        }
        aux.append(data)
    print(json.dumps(aux))

    # Cerrar la conexión
    conn.disconnect()

except Exception as e:
    print(f"Error: {e}")


