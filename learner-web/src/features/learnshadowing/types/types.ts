// src/components/shadowing/ShadowingPlayer.types.ts
export interface ShadowingPlayerRef {
  /** Seek về đầu đoạn của câu hiện tại (props.currentSentence) và play */
  playCurrentSegment: () => void;
  /** Tiếp tục play (không thay đổi currentTime) */
  play: () => void;
  /** Pause player */
  pause: () => void;
}
