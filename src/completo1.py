from zk import ZK, const

# Parámetros de conexión
zk_ip = '192.168.70.202'  # Dirección IP de tu dispositivo ZKTeco +1 por piso
zk_port = 4370            # Puerto por defecto de los dispositivos ZKTeco
timeout = 10              # Tiempo de espera para la conexión

# Crear una instancia del dispositivo
zk = ZK(zk_ip, port=zk_port, timeout=timeout)

try:
    # Conectar al dispositivo
    conn = zk.connect()
    print("Conectado al dispositivo ZKTeco")

    # Obtener y mostrar los registros de asistencia
    attendance_records = conn.get_attendance()
    print("\nRegistros de asistencia:")
    for record in attendance_records:
        print(f"ID: {record.user_id}, Fecha: {record.timestamp}, Estado: {record.status}, Verificado: {record.punch}")


    # Obtener la capacidad del dispositivo
    print("\nCapacidades del dispositivo:")
    device_info = conn.get_device_name()
    print(f"Nombre del dispositivo: {device_info}")
    device_serial = conn.get_serialnumber()
    print(f"Número de serie: {device_serial}")
    capacity = conn.get_capacity()
    print(f"Capacidad del dispositivo: {capacity}")

    # Cerrar la conexión
    conn.disconnect()
    print("\nConexión cerrada")

except Exception as e:
    print(f"Error: {e}")

