import mongoose from 'mongoose';
import { serverConfig } from '@oherb-tracker/config';

let connectionPromise: Promise<typeof mongoose> | undefined;

export function connectDatabase(uri = serverConfig.mongoUri): Promise<typeof mongoose> {
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI is not configured'));
  }

  connectionPromise ??= mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
  });

  return connectionPromise;
}

export async function pingDatabase(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    if (!serverConfig.mongoUri) return false;
    try {
      await connectDatabase();
    } catch {
      return false;
    }
  }

  try {
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  connectionPromise = undefined;
  await mongoose.disconnect();
}

export * from './models.js';
