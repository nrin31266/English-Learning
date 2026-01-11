
export interface ShadowingPlayerRef {
 
  playCurrentSegment: () => void;
  
 
  play: () => void;
  
 
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
