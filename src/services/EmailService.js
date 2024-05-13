const nodemailer = require('nodemailer')
const dotenv = require('dotenv');
dotenv.config()
var inlineBase64 = require('nodemailer-plugin-inline-base64');

const sendEmailCreateOrder = async (email,orderItems) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, 
    auth: {
      user: process.env.MAIL_ACCOUNT, 
      pass: process.env.MAIL_PASSWORD, 
    },
  });
  transporter.use('compile', inlineBase64({cidPrefix: 'somePrefix_'}));

  let listItem = '';
  const attachImage = []
  orderItems.forEach((order) => {
    listItem += `<div>
    <div>
      Bạn đã đặt sản phẩm <b>${order.name}</b> với số lượng: <b>${order.amount}</b> và giá là: <b>${order.price} VND</b></div>
      <div>Bên dưới là hình ảnh của sản phẩm</div>
    </div>`
    attachImage.push({path: order.image})
  })

  
  let info = await transporter.sendMail({
    from: process.env.MAIL_ACCOUNT, 
    to: email, 
    subject: "Bạn đã đặt hàng tại shop Bán hàng online", 
    text: "Hello world?", // plain text body
    html: `<div><b>Bạn đã đặt hàng thành công tại shop Bán hàng online</b></div> ${listItem}`,
    attachments: attachImage,
  });
}

module.exports = {
  sendEmailCreateOrder
}