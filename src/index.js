
const express = require("express");
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const routes = require('./routes')
const cors = require('cors');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const Review = require('./models/Comment')
const { createServer } = require("http");
const { Server } = require("socket.io");
const News = require("./models/News");
const AccessLog = require('./models/AccessLog.js');



dotenv.config()
mongoose.set('strictQuery', false);

const app = express()
const port = process.env.PORT || 3001
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

let connectedUsers = 0; 



app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser())
routes(app);


mongoose.connect(`${process.env.MONGO_DB}`)
    .then(() => {
        console.log('Connect Db success!')
    })
    .catch((err) => {
        console.log(err)
    })

const getCommentHistory = async () => {
    try {
        const comments = await Review.find().sort({ createdAt: -1 });
        return comments;
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử bình luận:', error);
        return [];
    }
};

const getNewsHistoryz = async () => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        return news;
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử khuyen mai:', error);
        return [];
    }
};

io.on("connection", async function (socket) {
    const moment = require('moment-timezone');
    const now = moment().tz('Asia/Ho_Chi_Minh');

    const commentHistory = await getCommentHistory(socket.productId);
    socket.emit('commentHistory', commentHistory);


    const NewsHistory = await getNewsHistoryz();
    io.sockets.emit('newsHistory', NewsHistory);

    socket.on('joinRoom', (productId) => {
        socket.productId = productId;
        socket.join(productId);
    });
 

    console.log("Co nguoi ket noi vao web:", socket.id, ", vao luc:", now.format());
    connectedUsers++;
    console.log(`So user dang truy cap trang web: ${connectedUsers}`);


    const log = new AccessLog({
        session_id: socket.id,
        action: 'connect',
        timestamp: now.format(),  
    });

    log.save();
    
    socket.on("disconnect", function () {
        const moment2 = require('moment-timezone');
        const now2 = moment2().tz('Asia/Ho_Chi_Minh');
        console.log(socket.id, " thoat ket khoi trang web vao luc:", now2.format());
        connectedUsers--;
        console.log(`So user dang truy cap trang web: ${connectedUsers}`);
        const log = new AccessLog({
            session_id: socket.id,
            action: 'disconnect',
            timestamp: now2.format(),
        });
        log.save();
    });

    socket.on("login", function () {
     
        socket.emit("login_success", "Login successfully");
    });
    //========================================================   

    socket.on("logout", function (data) {
      
        const { email } = data;

        
        console.log(` ${email} logged out successfully`);

        socket.emit("logout_success", { message: "Logout successfully" });
    });
    //========================================================
    // CHAT
    socket.on("chat message", function (message) {
      
        io.sockets.emit("chat message", message);

    });
    //=====================================================
    // COMMENT
    socket.on('addReview', async (data) => {
   
        const { content, rating, user, productId } = data;

        const newReview = new Review({
            content: content.content,

            rating: content.rating,
            user,
            productId,
        });

        await newReview.save();
        const updatedCommentHistory = await getCommentHistory();
    
        io.to(productId).emit('commentHistory', updatedCommentHistory);


    });


    socket.on("postNews", async (data) => {
      
        const { title, content } = data;
        const newNews = new News({
            title,
            content,
        });
        await newNews.save();
        const updatedNewsHistory = await getNewsHistoryz();
        io.sockets.emit('newNews', updatedNewsHistory);

    });
    
});
httpServer.listen(port, () => {
    console.log('Server is running in port: ', + port)
})