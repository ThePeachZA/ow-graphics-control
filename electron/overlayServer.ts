import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class OverlayServer {
  private app: express.Express;
  private server: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private port: number;
  private overlayState: any = {};

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.app.use(cors());
        this.app.use(express.json());

        // Serve overlay files
        const overlaysPath = join(process.cwd(), 'public', 'overlays');
        this.app.use('/overlays', express.static(overlaysPath));

        // Health check
        this.app.get('/health', (req, res) => {
          res.json({ status: 'ok', overlays: this.getConnectedOverlays() });
        });

        // Get current state
        this.app.get('/state', (req, res) => {
          res.json(this.overlayState);
        });

        // Create HTTP server
        this.server = createServer(this.app);

        // Create WebSocket server
        this.wss = new WebSocketServer({ server: this.server });

        this.wss.on('connection', (ws) => {
          log.info('Overlay connected');

          // Send current state to new connections
          ws.send(JSON.stringify({ type: 'init', data: this.overlayState }));

          ws.on('close', () => {
            log.info('Overlay disconnected');
          });

          ws.on('error', (error) => {
            log.error('WebSocket error:', error);
          });
        });

        this.server.listen(this.port, () => {
          log.info(`Overlay server started on port ${this.port}`);
          resolve(this.port);
        });

        this.server.on('error', (error) => {
          log.error('Server error:', error);
          reject(error);
        });
      } catch (error) {
        log.error('Failed to start overlay server:', error);
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }
      if (this.server) {
        this.server.close(() => {
          log.info('Overlay server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  broadcast(type: string, data: any): void {
    if (!this.wss) return;

    this.overlayState[type] = data;
    const message = JSON.stringify({ type, data });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private getConnectedOverlays(): number {
    if (!this.wss) return 0;
    let count = 0;
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) count++;
    });
    return count;
  }

  getPort(): number {
    return this.port;
  }
}
