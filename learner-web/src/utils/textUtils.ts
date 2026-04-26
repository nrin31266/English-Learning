// src/utils/textUtils.ts
export const getIndexFromChar = (letter: string, length: number): number =>{
    if (!letter || letter.length === 0) return 0;
    const code = letter.charCodeAt(0);

    // Nếu không parse được → trả 0
    if (isNaN(code)) return 0;

    return code % length;

} 
/**
 * Kiểm tra token có chứa dấu câu hay không
 * @param token - Chuỗi cần kiểm tra
 * @returns true nếu có dấu câu, false nếu không
 */
export function hasPunctuation(token: string | null | undefined): boolean {
    if (!token || token.length === 0) return false;

    const punctuationMarks = ".,!?;:\"()[]{}…—–-";
    for (const char of token) {
        if (punctuationMarks.includes(char)) {
            return true;
        }
    }
    return false;
}

/**
 * Chuẩn hóa từ: chữ thường, bỏ dấu nháy, chỉ giữ a-z0-9
 * @param token - Chuỗi cần chuẩn hóa
 * @returns Chuỗi đã chuẩn hóa hoặc null nếu input null
 */
export function normalizeWordLower(token: string | null | undefined): string | null {
    if (!token) return null;

    return token
        .toLowerCase()
        .replace(/'/g, "")
        .replace(/[^a-z0-9]/g, "");
}