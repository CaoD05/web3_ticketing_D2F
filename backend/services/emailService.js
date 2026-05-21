const nodemailer = require("nodemailer");

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Kiểm tra cấu hình email
let transporter = null;

if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  // Verify transporter khi khởi tạo
  transporter.verify((error) => {
    if (error) {
      console.warn("⚠️  Email transporter verification failed:", error.message);
      console.warn("   → Email sẽ không được gửi. Kiểm tra GMAIL_USER và GMAIL_APP_PASSWORD.");
    } else {
      console.log("✅ Email transporter sẵn sàng (Gmail SMTP)");
    }
  });
} else {
  console.warn(
    "⚠️  GMAIL_USER hoặc GMAIL_APP_PASSWORD chưa được cấu hình. " +
    "Chức năng gửi email sẽ không hoạt động."
  );
}

/**
 * sendOrderConfirmation — Gửi email xác nhận đặt vé thành công
 *
 * @param {Object} params
 * @param {string} params.toEmail - Email người nhận
 * @param {string} params.fullName - Tên người mua
 * @param {string} params.eventName - Tên sự kiện
 * @param {number} params.orderId - Mã đơn hàng
 * @param {number} params.ticketCount - Số lượng vé
 * @param {string} [params.eventDate] - Ngày sự kiện
 * @param {string} [params.location] - Địa điểm
 * @param {string} [params.totalAmount] - Tổng tiền
 */
async function sendOrderConfirmation({
  toEmail,
  fullName,
  eventName,
  orderId,
  ticketCount,
  eventDate,
  location,
  totalAmount,
}) {
  if (!transporter) {
    console.warn("[emailService] ⚠️ Transporter chưa sẵn sàng. Bỏ qua gửi email.");
    return { success: false, reason: "Email not configured" };
  }

  if (!toEmail) {
    console.warn("[emailService] ⚠️ Không có email người nhận. Bỏ qua.");
    return { success: false, reason: "No recipient email" };
  }

  // Format ngày sự kiện
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : "Chưa xác định";

  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
        🎉 Đặt vé thành công!
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">
        Cảm ơn bạn đã tin tưởng Web3 Ticketing
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        Xin chào <strong>${fullName || "bạn"}</strong>,
      </p>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Đơn hàng của bạn đã được tạo thành công. Dưới đây là thông tin chi tiết:
      </p>

      <!-- Order Details -->
      <div style="background: #f8f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 13px; width: 140px;">Mã đơn hàng</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">#${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 13px;">Sự kiện</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${eventName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 13px;">Số lượng vé</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${ticketCount} vé</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 13px;">Ngày sự kiện</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${formattedDate}</td>
          </tr>
          ${location ? `
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 13px;">Địa điểm</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${location}</td>
          </tr>
          ` : ""}
          ${totalAmount ? `
          <tr>
            <td style="padding: 8px 0; color: #888; font-size: 13px;">Tổng tiền</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${totalAmount}</td>
          </tr>
          ` : ""}
        </table>
      </div>

      <!-- Check-in Instructions -->
      <div style="background: #fff8e1; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffa726;">
        <h3 style="margin: 0 0 12px; color: #e65100; font-size: 15px;">
          📋 Hướng dẫn Check-in
        </h3>
        <ol style="margin: 0; padding-left: 20px; color: #555; font-size: 13px; line-height: 1.8;">
          <li>Mở ứng dụng <strong>Web3 Ticketing</strong> hoặc truy cập website</li>
          <li>Vào mục <strong>"Vé của tôi"</strong> (My Tickets)</li>
          <li>Chọn vé tương ứng với sự kiện <strong>${eventName}</strong></li>
          <li>Xuất trình <strong>mã QR</strong> cho nhân viên soát vé tại cổng vào</li>
          <li>Vé NFT trên blockchain sẽ được xác thực tự động ✅</li>
        </ol>
      </div>

      <p style="font-size: 13px; color: #999; margin-top: 20px; line-height: 1.6;">
        Lưu ý: Mỗi vé chỉ được sử dụng <strong>một lần</strong>. Vui lòng không chia sẻ mã QR cho người khác.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        Web3 Ticketing — Vé sự kiện trên Blockchain
      </p>
      <p style="margin: 5px 0 0; color: #bbb; font-size: 11px;">
        Email này được gửi tự động. Vui lòng không trả lời.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Web3 Ticketing" <${GMAIL_USER}>`,
    to: toEmail,
    subject: `🎫 Xác nhận đặt vé — ${eventName} (Đơn #${orderId})`,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[emailService] ✅ Email đã gửi tới ${toEmail} — MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[emailService] ❌ Gửi email thất bại tới ${toEmail}:`, error.message);
    return { success: false, reason: error.message };
  }
}

module.exports = { sendOrderConfirmation };
