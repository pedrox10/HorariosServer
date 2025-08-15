from zk import ZK
zk = ZK('192.168.200.3', port=4370)
conn = zk.connect()
conn.read_sizes()
print (conn.rec_cap)