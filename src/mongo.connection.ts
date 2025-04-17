// mongo/connection.ts
import mongoose from 'mongoose';

let isConnected = false;

export async function conectarMongo(uri: string) {
    if (isConnected) return;

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('[Mongo] Conexión exitosa');
        isConnected = true;
    } catch (error: any) {
        console.error('[Mongo] Error de conexión:', error.message);
        isConnected = false;
        // NO lanzamos el error para no detener el servidor
    }
}