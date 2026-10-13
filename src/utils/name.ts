// Tên gọi trong lời chào: với họ tên tiếng Việt, tên là từ cuối ("Nguyễn Văn An" → "An").
export function givenName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}
