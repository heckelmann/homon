# 🖥️ Homon - Cyberpunk System Monitor

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)

**Homon** is a futuristic, agentless system monitoring dashboard built with Next.js. It connects to your Linux servers via SSH to provide real-time metrics, process management, and Docker container oversight, all wrapped in a sleek cyberpunk interface.

## ✨ Features

### 🔍 Agentless Monitoring
- **Zero Install**: No agents required on target servers. Connects purely via SSH.
- **System Core**: Real-time tracking of OS, Kernel, Uptime, and Virtualization status.
- **Hardware Matrix**: Detailed CPU model, core count, and memory statistics.
- **Network Matrix**: Interface monitoring, IP addresses, Gateway, and DNS configuration.

### 📊 Visual Analytics
- **Live Gauges**: Real-time CPU and Memory load visualization.
- **Historical Data**: Interactive charts for CPU, Memory, and Disk usage over time (1h, 6h, 24h, 7d).
- **Storage Matrix**: Visual disk usage bars and filesystem details.

### 🛠️ Advanced Management
- **Process Matrix**: Live view of top running processes with sorting capabilities.
- **Docker Integration**: 
  - List running containers with status, state, and resource usage (CPU/Mem).
  - **Smart Linking**: Automatically generates clickable links for exposed ports using the host's public IP.
- **Web Terminal**: Full SSH terminal access directly in your browser.
- **File Explorer**: Browse, view, and edit files on remote hosts.

### 🔐 Security & Enterprise
- **Authentication**: Supports SSH keys and password-based authentication.
- **OAuth / SSO**: Integrated OpenID Connect (OIDC) support for enterprise login.
- **Credential Manager**: Centralized, encrypted storage for reusable credentials.

### 📡 Observability
- **OpenTelemetry (OTLP)**: Built-in support to export metrics to external collectors (e.g., Dynatrace).

## 🚀 Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Neon/Cyberpunk theme
- **Database**: SQLite (via Prisma)
- **SSH Client**: ssh2
- **Charts**: Recharts

## 🛠️ Getting Started

### Docker (Recommended)

1.  **Deploy with Docker Compose**:

    ```bash
    wget ht
    docker-compose up -d
    ```

2.  **Access the Dashboard**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

    *Data is persisted in the `./data` directory.*

### Multi-Architecture Build

Build for AMD64 and ARM64 using the included script:

```bash
./build_multi_arch.sh <your-image-name:tag>
```

### Manual Installation

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Initialize Database**:
    ```bash
    npx prisma migrate dev --name init
    ```

3.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    *This starts both the web server and the background metrics scheduler.*

## ⚙️ Configuration

### Environment Variables
Create a `.env` file or configure via Docker environment variables:

- `DATABASE_URL`: Path to SQLite DB (default: `"file:./data/homon.db"`)
- `APP_URL`: The public URL of the application (required for correct OAuth redirects behind proxies).
- `NEXTAUTH_SECRET`: Secret for session encryption.
- `NEXTAUTH_URL`: Canonical URL of the site.

### OTLP Export
Configure OpenTelemetry export in the UI settings to send metrics to your observability stack.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

