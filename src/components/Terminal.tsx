'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

interface TerminalProps {
  hostId: string;
}

export default function Terminal({ hostId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let isMounted = true;
    let handleResize: (() => void) | null = null;

    const initTerminal = async () => {
      if (!terminalRef.current) return;

      // Dynamically import xterm and addon to avoid SSR issues
      const { Terminal: XTerm } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');

      if (!isMounted) return;

      // Initialize Socket.IO
      const socket = io();
      socketRef.current = socket;

      // Initialize xterm.js
      const term = new XTerm({
        cursorBlink: true,
        theme: {
          background: '#0b101b',
          foreground: '#00f0ff',
          cursor: '#00f0ff',
          selectionBackground: 'rgba(0, 240, 255, 0.3)',
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
      });
      xtermRef.current = term;

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      term.loadAddon(fitAddon);

      term.open(terminalRef.current);
      
      // Small delay to ensure DOM is ready for measurements
      setTimeout(() => {
        if (isMounted) {
          try {
            fitAddon.fit();
          } catch (e) {
            console.error('Fit error:', e);
          }
        }
      }, 100);

      // Handle resize
      handleResize = () => {
        try {
          fitAddon.fit();
          if (socket.connected) {
            socket.emit('resize', { cols: term.cols, rows: term.rows });
          }
        } catch (e) {
          console.error('Resize error:', e);
        }
      };
      window.addEventListener('resize', handleResize);

      // Socket events
      socket.on('connect', () => {
        if (!isMounted) return;
        setStatus('connected');
        socket.emit('start-session', { hostId, cols: term.cols, rows: term.rows });
      });

      socket.on('data', (data: string) => {
        term.write(data);
      });

      socket.on('status', (status: string) => {
        if (!isMounted) return;
        setStatus(status);
        if (status === 'disconnected') {
          term.write('\r\n\x1b[31m*** DISCONNECTED ***\x1b[0m\r\n');
        }
      });

      socket.on('error', (err: string) => {
        term.write(`\r\n\x1b[31mError: ${err}\x1b[0m\r\n`);
      });

      // Terminal input
      term.onData((data) => {
        socket.emit('data', data);
      });
    };

    initTerminal();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [hostId]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0b101b]">
      <div className="flex items-center gap-2 p-2 border-b border-cyan-500/30 bg-[#0b101b]">
        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500'}`} />
        <span className="text-cyan-400 font-mono text-sm uppercase">Secure Shell // {status}</span>
      </div>
      <div className="flex-1 p-2 overflow-hidden" ref={terminalRef} />
    </div>
  );
}
