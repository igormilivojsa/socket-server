import { Server } from 'socket.io'
import express from 'express'
import http from "http"

const app = express();
app.use(express.json())

const server = http.createServer(app);
const activeUsers = new Map();

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
        body,
        user,
        chat: {
            id: chatId,
        },
    })

    response.sendStatus(200);
})

app.post('/notify/chat', (request, response) => {
    const {chatId, user, targetUser, creator} = request.body;

    io.to(`user_${targetUser}`).emit('new_chat', {
        chatId,
        user,
        creator
    })

    response.sendStatus(200)
})

app.post('/notify/chat-delete', (request, response) => {
    const { chatId } = request.body;

    io.to(`chat_${chatId}`).emit('chat_delete', { chatId });

    response.sendStatus(200);
})

app.post('/notify/message-delete', (request, response) => {
    const { messageId, chatId } = request.body;

    io.to(`chat_${chatId}`).emit('message_delete', { messageId })

    response.sendStatus(200);
})

app.patch('/notify/message-read', (request, response) => {
    const { messageId, chatId, userId } = request.body;

    io.to(`chat_${chatId}`).emit('message_read', { messageId, userId })

    response.sendStatus(200);
})

io.on("connection", (socket) => {
    socket.on('join_user', (userId) => {
        socket.userId = userId;

        if (!activeUsers.has(userId)) {
            activeUsers.set(userId, new Set())
            io.emit('online_user', { userId })
        }

        activeUsers.get(userId)?.add(socket.id)

        const currentlyOnline = Array.from(activeUsers.keys())
        socket.emit('current_online_users', { userIds: currentlyOnline })
    });


    socket.on('join_chat', (chatId) => {
        socket.join(`chat_${chatId}`)
        socket.emit('joined_chat', { chatId })
    })

    socket.on('typing', ({ chatId, userId }) => {
        socket.to(`chat_${chatId}`).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ chatId, userId }) => {
        socket.to(`chat_${chatId}`).emit('user_stop_typing', { userId });
    });

    socket.on('disconnect', () => {
        const userId = socket.userId;

        if (!userId) {
            return;
        }

        const sockets = activeUsers.get(userId);

        if (!sockets) {
            return;
        }
        sockets.delete(socket.id);

        if (sockets.size === 0) {
            activeUsers.delete(userId);

            io.emit('offline_user', { userId })
        }
    })
})