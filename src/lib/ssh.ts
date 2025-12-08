export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
  };
  diskUsage: {
    total: string;
    used: string;
    free: string;
    percent: string;
  };
  disks: DiskInfo[];
}

export interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usePercent: string;
  mount: string;
}

export interface DockerContainer {
  id: string;
  image: string;
  name: string;
  status: string;
  state: string;
  ports: string;
  cpu: string;
  memory: string;
}

export interface ProcessInfo {
  pid: string;
  user: string;
  cpu: string;
  mem: string;
  command: string;
}

export interface HostDetails {
  os: {
    name: string;
    kernel: string;
    uptime: string;
  };
  hardware: {
    cpuModel: string;
    cpuCores: number;
    memoryTotal: string;
    virtualization: string;
  };
  disks: DiskInfo[];
  network: {
    hostname: string;
    interfaces: { name: string; ip: string }[];
    gateway: string;
    mainIp?: string;
    dns: string[];
  };
  processes: ProcessInfo[];
  docker?: DockerContainer[];
}

export const getHostDetails = async (
  host: string,
  port: number,
  username: string,
  password?: string,
  privateKey?: string
): Promise<HostDetails> => {
  const { Client } = await import('ssh2');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      // Commands to gather detailed info
      // 1. OS Name (PRETTY_NAME from /etc/os-release)
      // 2. Kernel (uname -r)
      // 3. Uptime (uptime -p)
      // 4. CPU Model (lscpu | grep "Model name" | cut -d: -f2)
      // 5. CPU Cores (nproc)
      // 6. Memory Total (free -h | grep Mem | awk '{print $2}')
      // 7. Virtualization (systemd-detect-virt || echo "unknown")
      // 8. Disks (df -h --output=source,size,used,avail,pcent,target | grep -v "tmpfs\|devtmpfs\|udev")
      // 9. Hostname
      // 10. Network Interfaces (ip -4 -o addr show)
      // 11. Default Gateway (ip route | grep default)
      // 12. DNS Servers (cat /etc/resolv.conf | grep nameserver)
      // 13. Docker Containers (docker ps)

      const cmd = `
        grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"' && echo "---SPLIT---" &&
        uname -r && echo "---SPLIT---" &&
        uptime -p && echo "---SPLIT---" &&
        lscpu | grep "Model name" | cut -d: -f2 | sed 's/^[ \t]*//' && echo "---SPLIT---" &&
        nproc && echo "---SPLIT---" &&
        free -h | grep Mem | awk '{print $2}' && echo "---SPLIT---" &&
        (systemd-detect-virt || echo "none") && echo "---SPLIT---" &&
        df -h | grep -vE '^Filesystem|tmpfs|cdrom|udev|none' && echo "---SPLIT---" &&
        hostname && echo "---SPLIT---" &&
        ip -4 -o addr show | awk '{print $2 "," $4}' && echo "---SPLIT---" &&
        ip route | grep default | awk '{print $3}' && echo "---SPLIT---" &&
        ip route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -n 1 && echo "---SPLIT---" &&
        cat /etc/resolv.conf | grep nameserver | awk '{print $2}' && echo "---SPLIT---" &&
        ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -n 21 | tail -n 20 | awk '{print $1 "||" $2 "||" $3 "||" $4 "||" $5}' && echo "---SPLIT---" &&
        (docker ps --format '{{.ID}}||{{.Image}}||{{.Names}}||{{.Status}}||{{.State}}||{{.Ports}}' 2>/dev/null || echo "DOCKER_NOT_FOUND") && echo "---SPLIT---" &&
        (docker stats --no-stream --format '{{.ID}}||{{.CPUPerc}}||{{.MemPerc}}' 2>/dev/null || echo "DOCKER_STATS_NOT_FOUND")
      `;

      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let output = '';

        stream.on('close', (code: any, signal: any) => {
          conn.end();
          try {
            const parts = output.trim().split('---SPLIT---');
            if (parts.length < 15) {
               return reject(new Error('Failed to parse host details output'));
            }

            const osName = parts[0].trim();
            const kernel = parts[1].trim();
            const uptime = parts[2].trim();
            const cpuModel = parts[3].trim();
            const cpuCores = parseInt(parts[4].trim());
            const memoryTotal = parts[5].trim();
            const virtualization = parts[6].trim();
            
            const diskLines = parts[7].trim().split('\n');
            const disks: DiskInfo[] = diskLines.map(line => {
              const [filesystem, size, used, available, usePercent, mount] = line.split(/\s+/);
              return { filesystem, size, used, available, usePercent, mount };
            }).filter(d => d.filesystem && d.mount);

            const hostname = parts[8].trim();
            const netLines = parts[9].trim().split('\n');
            const interfaces = netLines.map(line => {
              const [name, ip] = line.split(',');
              return { name: name?.trim(), ip: ip?.trim() };
            }).filter(i => i.name && i.ip);

            const gateway = parts[10].trim() || 'N/A';
            const mainIp = parts[11].trim() || '127.0.0.1';
            const dns = parts[12].trim().split('\n').filter(ip => ip);

            let docker: DockerContainer[] | undefined;
            if (parts[14]) {
              const dockerOutput = parts[14].trim();
              const statsOutput = parts[15] ? parts[15].trim() : '';
              
              if (dockerOutput !== 'DOCKER_NOT_FOUND') {
                const statsMap = new Map<string, { cpu: string, mem: string }>();
                if (statsOutput && statsOutput !== 'DOCKER_STATS_NOT_FOUND') {
                  statsOutput.split('\n').forEach(line => {
                    const [id, cpu, mem] = line.split('||');
                    if (id) statsMap.set(id, { cpu, mem });
                  });
                }

                docker = dockerOutput.split('\n').filter(line => line).map(line => {
                  const [id, image, name, status, state, ports] = line.split('||');
                  const stats = statsMap.get(id) || { cpu: '0%', mem: '0%' };
                  return { 
                    id, 
                    image, 
                    name, 
                    status, 
                    state, 
                    ports: ports || '',
                    cpu: stats.cpu,
                    memory: stats.mem
                  };
                });
              }
            }

            const processLines = parts[13].trim().split('\n');
            const processes: ProcessInfo[] = processLines.map(line => {
              const [pid, user, cpu, mem, command] = line.split('||');
              return { pid, user, cpu, mem, command };
            }).filter(p => p.pid);

            resolve({
              os: {
                name: osName,
                kernel,
                uptime,
              },
              hardware: {
                cpuModel,
                cpuCores,
                memoryTotal,
                virtualization,
              },
              disks,
              network: {
                hostname,
                interfaces,
                gateway,
                mainIp,
                dns,
              },
              processes,
              docker,
            });
          } catch (e) {
            reject(e);
          }
        }).on('data', (data: any) => {
          output += data;
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 20000,
    });
  });
};

export const getSystemMetrics = async (
  host: string,
  port: number,
  username: string,
  password?: string,
  privateKey?: string
): Promise<SystemMetrics> => {
  const { Client } = await import('ssh2');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      // Chain commands to get all metrics
      const cmd = `
        top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}' && echo "---SPLIT---" &&
        free -m | grep Mem | awk '{print $2 " " $3 " " $4}' && echo "---SPLIT---" &&
        df -h / | tail -1 | awk '{print $2 " " $3 " " $4 " " $5}' && echo "---SPLIT---" &&
        df -h | grep -vE '^Filesystem|tmpfs|cdrom|udev|none'
      `;

      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let output = '';

        stream.on('close', (code: any, signal: any) => {
          conn.end();
          try {
            const parts = output.trim().split('---SPLIT---');
            if (parts.length < 4) {
               return reject(new Error('Unexpected output format from server'));
            }

            const cpuUsage = parseFloat(parts[0].trim());
            const [memTotal, memUsed, memFree] = parts[1].trim().split(' ').map(Number);
            const [diskTotal, diskUsed, diskFree, diskPercent] = parts[2].trim().split(' ');
            
            const diskLines = parts[3].trim().split('\n');
            const disks: DiskInfo[] = diskLines.map(line => {
              const [filesystem, size, used, available, usePercent, mount] = line.split(/\s+/);
              return { filesystem, size, used, available, usePercent, mount };
            }).filter(d => d.filesystem && d.mount);

            resolve({
              cpuUsage,
              memoryUsage: {
                total: memTotal,
                used: memUsed,
                free: memFree,
              },
              diskUsage: {
                total: diskTotal,
                used: diskUsed,
                free: diskFree,
                percent: diskPercent,
              },
              disks,
            });
          } catch (e) {
            reject(e);
          }
        }).on('data', (data: any) => {
          output += data;
        }).stderr.on('data', (data: any) => {
          // console.error('STDERR: ' + data);
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 20000, // Increase timeout
    });
  });
};

export interface FileEntry {
  name: string;
  type: 'd' | '-'; // 'd' for directory, '-' for file
  size: number;
  modifyTime: number;
  permissions: string;
}

export const listFiles = async (
  host: string,
  port: number,
  username: string,
  path: string = '/',
  password?: string,
  privateKey?: string
): Promise<FileEntry[]> => {
  const { Client } = await import('ssh2');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        sftp.readdir(path, (err, list) => {
          conn.end();
          if (err) return reject(err);

          const files: FileEntry[] = list.map((item) => ({
            name: item.filename,
            type: item.attrs.isDirectory() ? 'd' : '-',
            size: item.attrs.size,
            modifyTime: item.attrs.mtime,
            permissions: item.longname.split(' ')[0], // Simple extraction
          }));
          
          // Sort: Directories first, then files. Alphabetical within groups.
          files.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'd' ? -1 : 1;
          });

          resolve(files);
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 20000,
    });
  });
};

export const getFileContent = async (
  host: string,
  port: number,
  username: string,
  path: string,
  password?: string,
  privateKey?: string
): Promise<string> => {
  const { Client } = await import('ssh2');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        // Check if file exists and is not too large (e.g., limit to 1MB for safety)
        sftp.stat(path, (err, stats) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          
          if (stats.size > 1024 * 1024) { // 1MB limit
             conn.end();
             return reject(new Error('File too large to edit (max 1MB)'));
          }

          const stream = sftp.createReadStream(path);
          let content = '';

          stream.on('data', (chunk: Buffer) => {
            content += chunk.toString();
          });

          stream.on('end', () => {
            conn.end();
            resolve(content);
          });

          stream.on('error', (err: Error) => {
            conn.end();
            reject(err);
          });
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 20000,
    });
  });
};

export const saveFileContent = async (
  host: string,
  port: number,
  username: string,
  path: string,
  content: string,
  password?: string,
  privateKey?: string
): Promise<void> => {
  const { Client } = await import('ssh2');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        const stream = sftp.createWriteStream(path);
        
        stream.on('close', () => {
          conn.end();
          resolve();
        });

        stream.on('error', (err: Error) => {
          conn.end();
          reject(err);
        });

        stream.write(content);
        stream.end();
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 20000,
    });
  });
};

export const createDirectory = async (
  host: string,
  port: number,
  username: string,
  path: string,
  password?: string,
  privateKey?: string
): Promise<void> => {
  const { Client } = await import('ssh2');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        sftp.mkdir(path, (err) => {
          conn.end();
          if (err) return reject(err);
          resolve();
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 20000,
    });
  });
};

export const getDockerLogs = async (
  host: string,
  port: number,
  username: string,
  containerId: string,
  tail: number = 100,
  password?: string,
  privateKey?: string
): Promise<string> => {
  const { Client } = await import('ssh2');

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(`docker logs --tail ${tail} ${containerId}`, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        let data = '';
        
        stream.on('close', () => {
          conn.end();
          resolve(data);
        }).on('data', (chunk: any) => {
          data += chunk.toString();
        }).stderr.on('data', (chunk: any) => {
          data += chunk.toString();
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
      privateKey,
      readyTimeout: 20000,
    });
  });
};
