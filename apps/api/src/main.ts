import app from './app';
import { createServer } from 'node:http';
import { serverConfig } from '@oherb-tracker/config';
import { connectDatabase, disconnectDatabase } from '@oherb-tracker/database';
import { createSocketServer } from './socket/socket.server.js';

const httpServer = createServer(app);
createSocketServer(httpServer);

async function start() {
	try {
		await connectDatabase();
		console.log('[ready] MongoDB connected');
	} catch (error) {
		console.error('[startup] MongoDB connection failed', error);
	}

	httpServer.listen(serverConfig.port, () => {
		console.log(`[ready] API listening on http://localhost:${serverConfig.port}`);
	});
}

void start();

async function shutdown() {
	httpServer.close();
	await disconnectDatabase();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
