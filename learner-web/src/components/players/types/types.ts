
export interface PlayerRef {
 
  playCurrentSegment: () => void;
  
 
  play: () => void;
  
 
  pause: () => void;
  
  getUserInteracted: () => boolean;
}
