"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_http = require("http");
var import_url = require("url");
var import_next = __toESM(require("next"));
var import_socket = require("socket.io");
var import_ssh2 = require("ssh2");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = global;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// server.ts
var dev = process.env.NODE_ENV !== "production";
var hostname = process.env.HOSTNAME || "localhost";
var port = parseInt(process.env.PORT || "3000", 10);
var app = (0, import_next.default)({ dev, hostname, port });
var handle = app.getRequestHandler();
app.prepare().then(() => {
  const server = (0, import_http.createServer)(async (req, res) => {
    try {
      const parsedUrl = (0, import_url.parse)(req.url, true);
      if (parsedUrl.pathname?.startsWith("/socket.io/")) {
        return;
      }
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });
  const io = new import_socket.Server(server);
  io.on("connection", (socket) => {
    let conn = null;
    let stream = null;
    socket.on("start-session", async ({ hostId, cols, rows }) => {
      try {
        const host = await prisma.host.findUnique({
          where: { id: parseInt(hostId) }
        });
        if (!host) {
          socket.emit("error", "Host not found");
          return;
        }
        conn = new import_ssh2.Client();
        conn.on("ready", () => {
          socket.emit("status", "connected");
          conn.shell({ term: "xterm-256color", cols, rows }, (err, s) => {
            if (err) {
              socket.emit("error", "Failed to start shell: " + err.message);
              return;
            }
            stream = s;
            socket.emit("data", "\r\n*** SSH CONNECTION ESTABLISHED ***\r\n");
            stream.on("close", () => {
              socket.emit("status", "disconnected");
              conn?.end();
            }).on("data", (data) => {
              socket.emit("data", data.toString("utf-8"));
            });
            socket.on("data", (data) => {
              if (stream) {
                stream.write(data);
              }
            });
            socket.on("resize", ({ cols: cols2, rows: rows2 }) => {
              if (stream) {
                stream.setWindow(rows2, cols2, 0, 0);
              }
            });
          });
        }).on("close", () => {
          socket.emit("status", "disconnected");
        }).on("error", (err) => {
          socket.emit("error", "SSH Connection Error: " + err.message);
        }).connect({
          host: host.hostname,
          port: host.port,
          username: host.username,
          password: host.password || void 0,
          privateKey: host.privateKey || void 0
        });
      } catch (error) {
        console.error("Session error:", error);
        socket.emit("error", "Server error: " + error.message);
      }
    });
    socket.on("disconnect", () => {
      if (conn) {
        conn.end();
      }
    });
  });
  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
