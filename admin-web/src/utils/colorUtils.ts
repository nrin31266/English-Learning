import { TOPIC_COLORS, TOPIC_COLOR_LIST } from "../types/colorMap";

// Random 1 màu từ map
export function getRandomTopicColor(): string {
  const colors = TOPIC_COLOR_LIST;
  const index = Math.floor(Math.random() * colors.length);
  return colors[index];
}


// tính xem màu nền nên dùng chữ trắng hay đen
export function getTextColorForHex(hex: string): "light" | "dark" {
  const c = hex.substring(1); 
  const rgb = parseInt(c, 16); 
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  // tính luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance > 160 ? "dark" : "light";
}

// Lấy màu theo key
export function getTopicColor(key: string): string {
  return TOPIC_COLORS[key] ?? TOPIC_COLORS["blue"];
}
