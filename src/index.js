
const express = require("express");
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const routes = require('./routes')
const cors = require('cors');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
//socket
const Review = require('./models/Comment')
const { createServer } = require("http");
const { Server } = require("socket.io");
const News = require("./models/News");
const AccessLog = require('./models/AccessLog.js');

// Kiểm tra thời gian đã chuyển đổi

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
// const server = require('http').createServer(app);  // Tạo một server HTTP
// const io = require('socket.io')(server);  // Kết nối Socket.io với server
let connectedUsers = 0; // Biến đếm số người đang kết nối



app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser())
routes(app);

//========================================================
//Mongoo
mongoose.connect(`${process.env.MONGO_DB}`)
    .then(() => {
        console.log('Connect Db success!')
    })
    .catch((err) => {
        console.log(err)
    })
//========================================================
//Lây lich su danh gia san pham
const getCommentHistory = async () => {
    try {
        const comments = await Review.find().sort({ createdAt: -1 });
        return comments;
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử bình luận:', error);
        return [];
    }
};
//Lay lich su khuyen mai
const getNewsHistoryz = async () => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        return news;
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử khuyen mai:', error);
        return [];
    }
};
//========================================================
//Socket io
io.on("connection", async function (socket) {
    const moment = require('moment-timezone');
    const now = moment().tz('Asia/Ho_Chi_Minh');

    // Lấy và gửi lịch sử bình luận khi client kết nối
    const commentHistory = await getCommentHistory(socket.productId);
    socket.emit('commentHistory', commentHistory);

    //Lấy và gửi lịch sử news khi client kết nối
    const NewsHistory = await getNewsHistoryz();
    io.sockets.emit('newsHistory', NewsHistory);
    // console.log('newsHistory', updatedNewsHistory)
    // JOIN ROOM BINH LUAN
    socket.on('joinRoom', (productId) => {
        socket.productId = productId;
        socket.join(productId);
    });
    //===========================================================   
    // CONNECT 

    console.log("Co nguoi ket noi vao web:", socket.id, ", vao luc:", now.format());
    connectedUsers++;
    console.log(`So user dang truy cap trang web: ${connectedUsers}`);
    // Ghi lại sự kiện truy cập vào MongoDB khi có người kết nối

    // 'Asia/Ho_Chi_Minh' là múi giờ của Việt Nam

    const log = new AccessLog({
        session_id: socket.id,
        action: 'connect',
        timestamp: now.format(),  // Lưu thời gian đã chuyển đổi
    });

    log.save();
    //console.log('timestamp', now.format())
    //=======================================================
    //DISCONNECT
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
    //========================================================    
    // LOGIN
    socket.on("login", function () {
        // Xử lý thông tin đăng nhập ở đây, ví dụ kiểm tra thông tin đăng nhập
        // const { email } = data;                                                             // tưƠng tự như email = data.email
        // Nếu đăng nhập thành công, có thể thực hiện các hành động cần thiết
        // console.log(`${email} logged in successfully`);
        // Gửi thông báo đăng nhập thành công về cho client
        socket.emit("login_success", "Login successfully");
    });
    //========================================================   
    //LOGOUT
    socket.on("logout", function (data) {
        // Xử lý thông tin xuất ở đây, 
        const { email } = data;

        // Nếu đăng xuất thành công, có thể thực hiện các hành động cần thiết
        console.log(` ${email} logged out successfully`);

        // Gửi thông báo đăng nhập thành công về cho client
        socket.emit("logout_success", { message: "Logout successfully" });
    });
    //========================================================
    // CHAT
    socket.on("chat message", function (message) {
        // console.log("Message from client:", message);
        // Gửi lại tin nhắn đến tất cả các clients 
        io.sockets.emit("chat message", message);

    });
    //=====================================================
    // COMMENT
    socket.on('addReview', async (data) => {
        //  console.log("Comment from client:", data);
        // Lưu vào MongoDB bằng cách sử dụng model
        const { content, rating, user, productId } = data;

        // Lưu đánh giá vào MongoDB bằng cách sử dụng model
        const newReview = new Review({
            content: content.content,

            rating: content.rating,
            user,
            productId,
        });

        await newReview.save();
        const updatedCommentHistory = await getCommentHistory();
        // Gửi đánh giá mới đến tất cả các client
        io.to(productId).emit('commentHistory', updatedCommentHistory);


    });

    //========================================================
    //KHUYEN MAI
    socket.on("postNews", async (data) => {
        // console.log("Received news from client:", data);
        const { title, content } = data;
        const newNews = new News({
            title,
            content,
        });
        await newNews.save();
        const updatedNewsHistory = await getNewsHistoryz();
        io.sockets.emit('newNews', updatedNewsHistory);

    });
    //=========================================================
});
httpServer.listen(port, () => {
    console.log('Server is running in port: ', + port)
})