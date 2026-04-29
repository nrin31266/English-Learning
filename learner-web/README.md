# Learner Web

`learner-web` là giao diện cho học viên của English Learning Platform.

## Vai trò

- Học lesson và luyện shadowing theo từng câu.
- Phát audio, ghi âm phản hồi và nhận scoring từ AI service.
- Tra cứu từ vựng theo ngữ cảnh ngay trong bài học.
- Hiển thị feedback realtime từ notification service.

## Tech stack

- React 19
- Vite
- TypeScript
- Redux Toolkit
- Tailwind CSS
- Keycloak
- Howler
- React Router
- STOMP / WebSocket

## Chạy local

```bash
npm install
npm run dev
```

## Build và kiểm tra

```bash
npm run build
npm run lint
```

## Ghi chú tích hợp

- Frontend gọi qua `api-gateway`.
- Audio shadowing được gửi sang `language-processing-service` để transcribe và chấm điểm.
- Đăng nhập dùng Keycloak realm `english-learning-realm`.
