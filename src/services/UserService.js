const User = require("../models/UserModel")
const bcrypt = require("bcrypt")
const { genneralAccessToken, genneralRefreshToken } = require("./JwtService")
const { use } = require("../routes/UserRouter");
const nodemailer = require('nodemailer')
const { generateRandomToken } = require('../token/generateRandomToken')

const createUser = (newUser) => {
    return new Promise(async (resolve, reject) => {
        const { name, email, password, confirmPassword, phone } = newUser
        try {
            const checkUser = await User.findOne({
                email: email
            })
            if (checkUser !== null) {
                resolve({
                    status: 'ERR',
                    message: 'The email is already'
                })
            }
            const hash = bcrypt.hashSync(password, 10)
            const createdUser = await User.create({
                name,
                email,
                password: hash,
                phone
            })
            if (createdUser) {
                resolve({
                    status: 'OK',
                    message: 'SUCCESS',
                    data: createdUser
                })
            }
        } catch (e) {
            reject(e)
        }
    })
}

const loginUser = (userLogin) => {
    return new Promise(async (resolve, reject) => {
        const { email, password } = userLogin
        try {
            const checkUser = await User.findOne({
                email: email
            })
            if (checkUser === null) {
                resolve({
                    status: 'ERR',
                    message: 'The user is not defined'
                })
            }
            const comparePassword = bcrypt.compareSync(password, checkUser.password)

            if (!comparePassword) {
                resolve({
                    status: 'ERR',
                    message: 'The password or user is incorrect'
                })
            }
            const access_token = await genneralAccessToken({
                id: checkUser.id,
                isAdmin: checkUser.isAdmin
            })

            const refresh_token = await genneralRefreshToken({
                id: checkUser.id,
                isAdmin: checkUser.isAdmin
            })

            resolve({
                status: 'OK',
                message: 'SUCCESS',
                access_token,
                refresh_token
            })
        } catch (e) {
            reject(e)
        }
    })
}

const forgotPassword = async (email) => {
    try {
        const user = await User.findOne({ email });

        if (!user) {
            throw new Error("Người dùng với địa chỉ email này không tồn tại.");
        }

        const resetToken = await generateRandomToken(32);

        // Lưu trữ mã thông báo và thời hạn của nó trong tài khoản người dùng
        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + 60 * 1000);
        await user.save();

        const resetPasswordLink = `${process.env.YOUR_CLIENT_URL}/reset-password/${resetToken}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_ACCOUNT,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.MAIL_ACCOUNT,
            to: user.email,
            subject: "Khôi phục mật khẩu",
            text: `Mã khôi phục mật khẩu của bạn là: ${resetToken}`,
            html: `
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p>Vui lòng nhấp vào liên kết dưới đây để đặt lại mật khẩu. 
          Lưu ý, liên kết chỉ có hiệu lực trong vòng 1 phút kể từ thời điểm bạn nhận được!</p>
          <a href="${resetPasswordLink}">${resetPasswordLink}</a>
        `,
        };

        await transporter.sendMail(mailOptions);

        return { status: "OK", message: "Email khôi phục mật khẩu đã được gửi thành công." };
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        throw error;
    }
};


const resetPassword = async (resetToken, password) => {
    try {
        const user = await User.findOne({
            resetToken,
            resetTokenExpires: { $gt: Date.now() },

        });
        console.log('user', user)
        if (!user) {
            return { status: "ERR", message: "Invalid or expired reset token." };
        }

        user.password = bcrypt.hashSync(password, 10);
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();

        return { status: "OK", message: "Password reset successfully." };
    } catch (error) {
        console.error("Error resetting password:", error);
        throw error;
    }
};


const updateUser = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const checkUser = await User.findOne({
                _id: id
            })
            if (checkUser === null) {
                resolve({
                    status: 'ERR',
                    message: 'The user is not defined'
                })
            }

            const updatedUser = await User.findByIdAndUpdate(id, data, { new: true })
            resolve({
                status: 'OK',
                message: 'SUCCESS',
                data: updatedUser
            })
        } catch (e) {
            reject(e)
        }
    })
}

const deleteUser = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const checkUser = await User.findOne({
                _id: id
            })
            if (checkUser === null) {
                resolve({
                    status: 'ERR',
                    message: 'The user is not defined'
                })
            }

            await User.findByIdAndDelete(id)
            resolve({
                status: 'OK',
                message: 'Delete user success',
            })
        } catch (e) {
            reject(e)
        }
    })
}

const deleteManyUser = (ids) => {
    return new Promise(async (resolve, reject) => {
        try {

            await User.deleteMany({ _id: ids })
            resolve({
                status: 'OK',
                message: 'Delete user success',
            })
        } catch (e) {
            reject(e)
        }
    })
}

const getAllUser = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const allUser = await User.find().sort({ createdAt: -1, updatedAt: -1 })
            resolve({
                status: 'OK',
                message: 'Success',
                data: allUser
            })
        } catch (e) {
            reject(e)
        }
    })
}

const getDetailsUser = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findOne({
                _id: id
            })
            if (user === null) {
                resolve({
                    status: 'ERR',
                    message: 'The user is not defined'
                })
            }
            resolve({
                status: 'OK',
                message: 'SUCESS',
                data: user
            })
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = {
    createUser,
    loginUser,
    forgotPassword,
    resetPassword,
    updateUser,
    deleteUser,
    getAllUser,
    getDetailsUser,
    deleteManyUser
}