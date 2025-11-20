export const getIndexFromChar = (letter: string, length: number): number =>{
    if (!letter || letter.length === 0) return 0;
    const code = letter.charCodeAt(0);

    // Nếu không parse được → trả 0
    if (isNaN(code)) return 0;

    return code % length;

} 