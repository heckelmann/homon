import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { Client } from 'ssh2';
import { prisma } from './src/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import { decrypt } from './src/lib/encryption';

const execAsync = promisify(exec);

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await execAsync('npx prisma migrate deploy');
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    // We might want to exit if migrations fail, or continue and hope for the best
    // process.exit(1); 
  }
}

runMigrations().then(() => {
  app.prepare().then(() => {
    const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      
      // Let Socket.IO handle its own requests
      if (parsedUrl.pathname?.startsWith('/socket.io/')) {
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    let conn: Client | null = null;
    let stream: any = null;

    socket.on('start-session', async ({ hostId, cols, rows }) => {
      try {
        const host = await prisma.host.findUnique({
          where: { id: parseInt(hostId) },
          include: { credential: true },
        });

        if (!host) {
          socket.emit('error', 'Host not found');
          return;
        }

        const username = host.credential?.username || host.username;
        const password = decrypt(host.credential?.password || host.password);
        const privateKey = decrypt(host.credential?.privateKey || host.privateKey);

        if (!username) {
          socket.emit('error', 'No username configured');
          return;
        }

        conn = new Client();

        conn.on('ready', () => {
          socket.emit('status', 'connected');
          conn!.shell({ term: 'xterm-256color', cols, rows }, (err, s) => {
            if (err) {
              socket.emit('error', 'Failed to start shell: ' + err.message);
              return;
            }
            stream = s;
            
            socket.emit('data', '\r\n*** SSH CONNECTION ESTABLISHED ***\r\n');

            stream.on('close', () => {
              socket.emit('status', 'disconnected');
              conn?.end();
            }).on('data', (data: any) => {
              socket.emit('data', data.toString('utf-8'));
            });

            socket.on('data', (data) => {
              if (stream) {
                stream.write(data);
              }
            });

            socket.on('resize', ({ cols, rows }) => {
              if (stream) {
                stream.setWindow(rows, cols, 0, 0);
              }
            });
          });
        }).on('close', () => {
          socket.emit('status', 'disconnected');
        }).on('error', (err) => {
          socket.emit('error', 'SSH Connection Error: ' + err.message);
        }).connect({
          host: host.hostname,
          port: host.port,
          username: username,
          password: password || undefined,
          privateKey: privateKey || undefined,
        });

      } catch (error: any) {
        console.error('Session error:', error);
        socket.emit('error', 'Server error: ' + error.message);
      }
    });

    socket.on('disconnect', () => {
      if (conn) {
        conn.end();
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
});
