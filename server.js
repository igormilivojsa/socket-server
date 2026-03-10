import { Server } from 'socket.io'
import express, { response } from 'express'
import http from "http"

const app = express();
app.use(express.json())

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

server.listen(3001, '0.0.0.0', () => {
    console.log('Socket server running on port 3001')
})

app.post('/notify/message', (request, response) => {
    const {id, chatId, body, user} = request.body;

    io.to(`chat_${chatId}`).emit('new_message', {
        id,
        chatId,
        body,
        user,
    })

    response.sendStatus(200);
})

// app.post('/notify/chat', (request, response) => {
//     const {chatId, user} = request.body;
//
//     io.to(`user_${chatId}`).emit('new_chat', {
//         chatId,
//         user
//     })
// })

io.on("connection", (socket) => {
    socket.on('join_chat', (chatId) => {
        socket.join(`chat_${chatId}`)
        socket.emit('joinded_chat', { chatId })
    })
})