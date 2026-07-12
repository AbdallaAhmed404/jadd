const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const app = express();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware للتعرف على هوية المستخدم
io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) return next(new Error("Invalid user"));
    socket.userId = userId;
    next();
});

const connectDB = require('./conect');
const UserRouter = require('./routes/UserRouts');
const AdminRouter = require('./routes/AdminRouts');
const errorHandler = require('./middlewares/errorhandler');
require('dotenv').config();

app.use((req, res, next) => { req.io = io; next(); });
app.use(cors());
app.use(express.json());
app.use('/user', UserRouter);
app.use('/admin', AdminRouter);
app.use(errorHandler);

io.on('connection', (socket) => {
    socket.on('join_chat', (conversationId) => {
        socket.join(conversationId);
    });

    socket.on('mark_as_read', async ({ conversationId }) => {
        try {
            const Message = require('./models/MessageModel'); 
            
            // تحديث الرسائل التي لم يرسلها المستخدم الحالي فقط
            await Message.updateMany(
                { 
                    conversationId: conversationId, 
                    isRead: false,
                    senderId: { $ne: socket.userId }
                },
                { $set: { isRead: true } }
            );

            socket.to(conversationId).emit('messages_read', { conversationId });
        } catch (err) {
            console.error("Error marking messages as read:", err);
        }
    });
});

connectDB();
server.listen(4000, () => { console.log('server is running on port 4000'); });