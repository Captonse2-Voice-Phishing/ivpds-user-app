import {
  formatClock,
  formatDateTime,
  formatDuration,
  formatFileSize,
  formatPercent,
  formatRelativeTime,
} from '../format';

describe('formatDuration', () => {
  it.each([
    [0, '0 giây'],
    [30, '30 giây'],
    [60, '1 phút'],
    [150, '2 phút 30 giây'],
    [150.2, '2 phút 30 giây'],
    [59.6, '1 phút'],
    [3600, '1 giờ'],
    [3723, '1 giờ 2 phút 3 giây'],
    [3605, '1 giờ 5 giây'],
  ])('%p giây → %p', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('trả chuỗi rỗng khi không có giá trị hợp lệ', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(Number.NaN)).toBe('');
    expect(formatDuration(-5)).toBe('');
  });
});

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [5.9, '0:05'],
    [65, '1:05'],
    [750, '12:30'],
    [3723, '1:02:03'],
  ])('%p giây → %p', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });

  it('giá trị thiếu hoặc sai thì hiện 0:00', () => {
    expect(formatClock(null)).toBe('0:00');
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(-1)).toBe('0:00');
  });
});

describe('formatDateTime', () => {
  it('hiện theo giờ của máy, dạng dd/MM/yyyy HH:mm', () => {
    expect(formatDateTime(new Date(2026, 9, 10, 13, 15))).toBe('10/10/2026 13:15');
    expect(formatDateTime(new Date(2026, 0, 5, 7, 3))).toBe('05/01/2026 07:03');
  });

  it('đổi chuỗi ISO UTC sang giờ của máy', () => {
    const iso = '2026-10-10T06:15:30Z';
    const local = new Date(iso);
    expect(formatDateTime(iso)).toBe(formatDateTime(local));
    expect(formatDateTime(iso)).toMatch(/^\d{2}\/\d{2}\/2026 \d{2}:15$/);
  });

  it('trả chuỗi rỗng khi null hoặc sai dạng', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('không phải ngày')).toBe('');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date(2026, 9, 10, 12, 0, 0);
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it.each([
    [10, 'Vừa xong'],
    [5 * 60, '5 phút trước'],
    [59 * 60, '59 phút trước'],
    [2 * 3600, '2 giờ trước'],
    [3 * 86400, '3 ngày trước'],
  ])('%p giây trước → %p', (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), now)).toBe(expected);
  });

  it('quá 7 ngày thì hiện ngày giờ đầy đủ', () => {
    expect(formatRelativeTime(ago(8 * 86400), now)).toBe('02/10/2026 12:00');
  });
});

describe('formatFileSize và formatPercent', () => {
  it('định dạng dung lượng', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1245678)).toBe('1,2 MB');
    expect(formatFileSize(null)).toBe('');
  });

  it('định dạng phần trăm từ tỉ lệ 0–1', () => {
    expect(formatPercent(0.98)).toBe('98%');
    expect(formatPercent(0.999912)).toBe('100%');
    expect(formatPercent(null)).toBe('');
  });
});
