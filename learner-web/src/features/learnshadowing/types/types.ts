/**
 * File types.ts - Định nghĩa các interface và type cho tính năng Shadowing
 * 
 * Mục đích:
 * - Định nghĩa các phương thức cần thiết để điều khiển media player (Audio/YouTube)
 * - Đảm bảo tính nhất quán giữa các component player khác nhau
 * 
 * Sử dụng:
 * - Component cha (ShadowingMode) sử dụng ref này để điều khiển player
 * - AudioShadowing và YouTubeShadowing implement interface này
 */

/**
 * Interface cho ref của media player trong chế độ shadowing
 * Được sử dụng bởi cả AudioShadowing và YouTubeShadowing component
 */
export interface ShadowingPlayerRef {
  /**
   * Phát đoạn audio/video của câu hiện tại từ đầu
   * - Seek về audioStartMs của câu (có thể có padding)
   * - Tự động play sau khi seek
   * - Nếu autoStop = true, sẽ dừng tại audioEndMs
   */
  playCurrentSegment: () => void;
  
  /**
   * Tiếp tục phát media từ vị trí hiện tại
   * - Không thay đổi currentTime
   * - Chỉ play nếu user đã tương tác (để tuân thủ chính sách browser)
   */
  play: () => void;
  
  /**
   * Tạm dừng media player
   * - Clear timeout của autoStop (nếu có)
   */
  pause: () => void;
  
  /**
   * Kiểm tra xem user đã tương tác với player chưa
   * @returns true nếu user đã click "Bắt đầu" hoặc tương tác với player
   * 
   * Lý do cần check:
   * - Browser yêu cầu user interaction trước khi play audio/video
   * - Tránh lỗi "play() failed because user didn't interact"
   */
  getUserInteracted: () => boolean;
}
