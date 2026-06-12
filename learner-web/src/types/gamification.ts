// src/types/gamification.ts

export interface IGamificationState {
  userId: string;
  totalXp: number;
  rewardCoins: number;
  rewardGems: number; // Thêm trường này để hứng dữ liệu Gem từ Backend (nếu có)
  currentStreak: number;
  longestStreak: number;
  
  // Các trường thông tin tính toán động dựa trên thuật toán O(1)
  level: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  progressPercent: number;

  // Hàng đợi quản lý trạng thái hiển thị hiệu ứng chuyển động toàn cục
  xpQueue: IXPParticle[];
}
export interface IXPParticle {
  id: string;     // Mã định danh duy nhất (UUID hoặc Timestamp kết hợp Random) để quản lý vòng đời Component
  amount: number; // Số lượng điểm kinh nghiệm (XP) được cộng vào
  source: string; // Nguồn kích hoạt phần thưởng (ví dụ: "Dictation", "Shadowing", "Vocabulary")
}

export interface IUserGamificationResponse {
  userId: string;
  totalXp: number;
  rewardCoins: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  rewardGems: number; // Thêm trường này để hứng dữ liệu Gem từ Backend (nếu có)
}