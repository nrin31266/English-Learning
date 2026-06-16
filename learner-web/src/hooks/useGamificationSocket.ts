// src/hooks/useGamificationSocket.ts
import { useEffect } from "react";
import { useAppDispatch } from "@/store";
import { gainRewards } from "@/store/gamificationSlice";
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider";
// Giả định bác có hàm updateStreak, nếu chưa có thì cmt lại dùng sau
// import { updateStreak } from "@/store/gamificationSlice"; 


export const useGamificationSocket = () => {
  const stompClient = useWebSocket();
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!stompClient?.connected) {
      return;
    }
//     stompClient.subscribe("/topic/debug/gamification", (message: any) => {
//   console.log("📢 DEBUG broadcast received:", JSON.parse(message.body));
// });
    const debugSubscription = stompClient.subscribe("/topic/debug/gamification", (message: any) => {
      console.log("📢 DEBUG broadcast received:", JSON.parse(message.body));
    });

    // Dọn dẹp subscription debug khi component unmount
    return () => {
      debugSubscription.unsubscribe();
    };

  }, [stompClient, dispatch]);
  useEffect(() => {
    // Chỉ chạy khi đã kết nối STOMP thành công
    if (!stompClient?.connected) return;

    // Đăng ký nhận kênh thông báo Gamification ma thuật của Spring (/user/...)
    const subscription = stompClient.subscribe(
      "/user/queue/gamification/alerts",
      (message: any) => {
        try {
          const event = JSON.parse(message.body);

          console.log("📥 Nhận được Socket Event Gamification:", event);

          // Xử lý rẽ nhánh theo hành động
          switch (event.actionType) {
            case "REWARD_EARNED":
              // Payload từ backend: { earnedXp: ..., earnedCoins: ... }
              dispatch(
                gainRewards({
                  xp: event.payload.earnedXp,
                  coins: event.payload.earnedCoins,
                  source: "websocket",
                })
              );
              break;

            case "STREAK_UPDATED":
              // Tương lai mở rộng: Nổ hiệu ứng chuỗi
              // dispatch(updateStreak(event.payload));
              break;

            default:
              console.warn("⚠️ Chưa xử lý Gamification Action:", event.actionType);
          }
        } catch (error) {
          console.error("❌ Lỗi parse thông báo Gamification WebSocket", error);
        }
      }
    );

    // Dọn dẹp listener khi Component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [stompClient, dispatch]);
};