import { io } from "socket.io-client";

const socket = io("http://localhost:3002");

// Unirse a un examen específico (opcional)
const examId = 123;
socket.emit("join_exam", examId);

socket.on("connect", () => {
  console.log("Conectado al servidor:", socket.id);
});

socket.on("attempt_created", (attempt) => {
  console.log("Nuevo intento recibido:", attempt);
});

socket.on("answer_created", (answer) => {
  console.log("Nueva respuesta recibida:", answer);
});

socket.on("event_created", (event) => {
  console.log("Nuevo evento recibido:", event);
});

socket.on("exam_in_progress_created", (exam) => {
  console.log("Examen en curso recibido:", exam);
});

socket.on("disconnect", () => {
  console.log("Desconectado del servidor");
});
