// Tra bảng an toàn với khóa đến từ backend (tránh trúng thuộc tính kế thừa như "constructor").
export function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}
