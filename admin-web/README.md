# Admin Web

`admin-web` là giao diện quản trị của English Learning Platform.

## Vai trò

- Quản lý lesson và metadata nội dung.
- Theo dõi pipeline tạo lesson và trạng thái xử lý.
- Hỗ trợ thao tác với dữ liệu phục vụ học viên.

## Tech stack

- React 19
- Vite
- TypeScript
- Redux Toolkit
- Tailwind CSS
- Keycloak
- TanStack Table
- STOMP / realtime updates

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
- Xác thực dùng Keycloak realm `english-learning-realm`.
- Dữ liệu realtime từ notification service được đẩy qua STOMP/WebSocket.
