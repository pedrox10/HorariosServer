from zk import ZK
import sys
import json

def check_connection(ip, port=4370):
    zk = ZK(ip, port=port, timeout=5)
    try:
        conn = zk.connect()
        if conn:
            zk.disconnect()
            return {"conectado": True}
        else:
            return {"conectado": False}
    except Exception as e:
        return {"conectado": False, "error": str(e)}

if __name__ == "__main__":
    ip = sys.argv[1]  # IP del dispositivo
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 4370
    result = check_connection(ip, port)
    print(json.dumps(result))