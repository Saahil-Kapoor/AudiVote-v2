const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer);

  global.io = io;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });
  });

  httpServer.listen(3000, () => {
    console.log("Ready on http://localhost:3000");
  });
});