# BÁ KHÍ AI – Trí tuệ mạnh mẽ – Đồng hành thông minh

Chatbot dùng Google Gemini. API key nằm ở máy chủ, không bao giờ xuất hiện trong trình duyệt.

## Chạy trên máy (cần Node.js 18 trở lên)
1. Tạo key MỚI tại https://aistudio.google.com/apikey (xóa key cũ đã lộ).
2. Sao chép `.env.example` thành `.env`, điền `GEMINI_API_KEY=...`
3. Chạy: `node server.js` rồi mở http://localhost:3000

## Đưa lên mạng
Triển khai thư mục này lên bất kỳ nơi chạy được Node (Render, Railway, Fly.io, VPS...).
Đặt `GEMINI_API_KEY` trong mục Environment Variables / Secrets của nền tảng. Không đưa file `.env` lên Git.

## Đổi mô hình
Sửa `GEMINI_MODEL` trong `.env` (ví dụ một mô hình Gemini mới hơn) rồi khởi động lại.

## Đóng gói APK cho Android (không cần cài Android Studio)
1. Đưa máy chủ lên mạng (mục "Đưa lên mạng" ở trên) để có địa chỉ HTTPS, ví dụ https://ba-khi-ai.onrender.com
2. Tạo repo GitHub (để Private), đẩy toàn bộ thư mục này lên nhánh `main`. File `.env` đã được `.gitignore` loại trừ.
3. Trong repo: Settings → Secrets and variables → Actions → tab Variables → New repository variable
   Tên `SERVER_URL`, giá trị là địa chỉ ở bước 1.
4. Vào tab Actions → "Build APK" → Run workflow. Khoảng 5–8 phút sau, tải `ba-khi-ai-apk` ở mục Artifacts.
5. Giải nén, chép `app-debug.apk` sang điện thoại và cài (cần cho phép "Cài ứng dụng từ nguồn không xác định").
Đây là bản debug để dùng cá nhân; muốn đăng Google Play cần build bản release có ký.
