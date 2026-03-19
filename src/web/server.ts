/**
 * AgentScope Web Server
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  globalStorage,
  globalEventBus,
  globalAnalyzer,
  type AgentEvent,
} from '../core/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Web 服务器 */
export class WebServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventForwarding();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // 静态文件
    const staticPath = path.join(__dirname, 'static');
    this.app.use(express.static(staticPath));
  }

  private setupRoutes(): void {
    const router = express.Router();

    // ===== 会话 API =====

    // 获取所有会话
    router.get('/sessions', (req, res) => {
      try {
        const sessions = globalStorage.getAllSessions();
        res.json({ success: true, data: sessions });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // 获取单个会话
    router.get('/sessions/:id', (req, res) => {
      try {
        const session = globalStorage.getSession(req.params.id);
        if (!session) {
          res.status(404).json({ success: false, error: 'Session not found' });
          return;
        }
        res.json({ success: true, data: session });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // 删除会话
    router.delete('/sessions/:id', (req, res) => {
      try {
        globalStorage.deleteSession(req.params.id);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // ===== 事件 API =====

    // 获取会话事件
    router.get('/sessions/:id/events', (req, res) => {
      try {
        const events = globalStorage.getEvents(req.params.id);
        res.json({ success: true, data: events });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // ===== 追踪 API =====

    // 获取决策树
    router.get('/sessions/:id/trace', (req, res) => {
      try {
        const trace = globalStorage.getTrace(req.params.id);
        if (!trace) {
          res.status(404).json({ success: false, error: 'Trace not found' });
          return;
        }
        res.json({ success: true, data: trace });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // ===== 分析 API =====

    // 获取性能分析
    router.get('/sessions/:id/analysis', (req, res) => {
      try {
        // 先查缓存
        let analysis = globalStorage.getAnalysis(req.params.id);

        // 没有则实时分析
        if (!analysis) {
          analysis = globalAnalyzer.analyze(req.params.id);
        }

        res.json({ success: true, data: analysis });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // 快速分析
    router.get('/sessions/:id/quick-analysis', (req, res) => {
      try {
        const result = globalAnalyzer.quickAnalyze(req.params.id);
        res.json({ success: true, data: result });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // 对比多个会话
    router.post('/sessions/compare', (req, res) => {
      try {
        const { sessionIds } = req.body;
        if (!Array.isArray(sessionIds)) {
          res.status(400).json({ success: false, error: 'sessionIds must be an array' });
          return;
        }
        const result = globalAnalyzer.compare(sessionIds);
        res.json({ success: true, data: result });
      } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
      }
    });

    // ===== 系统 API =====

    // 健康检查
    router.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'ok',
          version: '0.1.0',
          uptime: process.uptime(),
          clients: this.clients.size,
        },
      });
    });

    this.app.use('/api', router);

    // 前端路由 fallback
    this.app.get('*', (req, res) => {
      const indexPath = path.join(__dirname, 'static', 'index.html');
      res.sendFile(indexPath);
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // 发送欢迎消息
      ws.send(JSON.stringify({
        type: 'connected',
        data: { message: 'AgentScope WebSocket connected', version: '0.1.0' },
      }));

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleWsMessage(ws, msg);
        } catch {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid JSON' } }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });
  }

  private handleWsMessage(ws: WebSocket, msg: any): void {
    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
        break;

      case 'subscribe':
        // 订阅特定会话的实时事件
        ws.send(JSON.stringify({
          type: 'subscribed',
          data: { sessionId: msg.data?.sessionId },
        }));
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', data: { message: `Unknown message type: ${msg.type}` } }));
    }
  }

  /** 将 Agent 事件实时推送到所有 WebSocket 客户端 */
  private setupEventForwarding(): void {
    globalEventBus.onAll((event: AgentEvent) => {
      const message = JSON.stringify({ type: 'agent_event', data: event });
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    });
  }

  /** 广播消息给所有客户端 */
  broadcast(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  /** 启动服务器 */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  /** 停止服务器 */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.close();
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }
}
