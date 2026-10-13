VI = {
    "mail.not_configured": "Chưa cấu hình SMTP_HOST trong .env",
    "mail.auth_failed": "SMTP từ chối SMTP_USER hoặc SMTP_PASSWORD",
    "mail.no_auth_ext": "Server không cho đăng nhập qua kết nối không mã hóa. Nếu dùng SMTP thật, đặt SMTP_SECURITY=starttls (cổng 587) hoặc ssl (cổng 465). Nếu dùng Mailpit, để trống SMTP_USER và SMTP_PASSWORD",
    "mail.sender_refused": "SMTP từ chối địa chỉ gửi, hãy kiểm tra SMTP_FROM",
    "mail.recipient_refused": "SMTP từ chối địa chỉ người nhận",
    "mail.connect": "Không kết nối được tới {where}. Kiểm tra SMTP_HOST, SMTP_PORT, SMTP_SECURITY và service SMTP đã chạy chưa",
    "mail.generic": "Lỗi SMTP: {detail}",
}


EN = {
    "mail.not_configured": "SMTP_HOST isn't set in .env",
    "mail.auth_failed": "SMTP rejected SMTP_USER or SMTP_PASSWORD",
    "mail.no_auth_ext": "The server doesn't allow sign-in over an unencrypted connection. If you use a real SMTP server, set SMTP_SECURITY=starttls (port 587) or ssl (port 465). If you use Mailpit, leave SMTP_USER and SMTP_PASSWORD empty",
    "mail.sender_refused": "SMTP rejected the sender address, check SMTP_FROM",
    "mail.recipient_refused": "SMTP rejected the recipient address",
    "mail.connect": "Couldn't connect to {where}. Check SMTP_HOST, SMTP_PORT, SMTP_SECURITY and that the SMTP service is running",
    "mail.generic": "SMTP error: {detail}",
}
