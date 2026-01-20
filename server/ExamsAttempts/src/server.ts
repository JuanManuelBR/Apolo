import http from "http";
import { Server } from "socket.io";
import app from "./app";

// Puerto
const port = process.env.PORT || 3000;

// Creamos el servidor HTTP a partir de Express
const server = http.createServer(app);

// Inicializamos Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Guardamos io en app para usarlo en los services
app.set("io", io);

// Escucha de conexiones WebSocket
io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Ejemplo: cliente se une a un examen específico
  socket.on("join_exam", (examId: number) => {
    socket.join(`exam_${examId}`);
    console.log(`Socket ${socket.id} se unió al room exam_${examId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciamos el servidor
server.listen(port, () => {
  console.log(`Microservicio ExamsAttempts corriendo en http://localhost:${port}`);
});
