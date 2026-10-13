import { fireEvent, render, screen } from '@testing-library/react-native';

import type { AnalysisSummary, HistoryItem } from '../../../api/types';
import { formatDate } from '../../../utils/format';
import { givenName } from '../../../utils/name';
import { CallRow } from '../CallRow';
import {
  EMPTY_FILTERS,
  hasAdvancedFilters,
  hasAnyFilter,
  toHistoryQuery,
  type HistoryFilters,
} from '../filters';

describe('toHistoryQuery', () => {
  it('không lọc gì: không gửi tham số nào', () => {
    expect(toHistoryQuery(EMPTY_FILTERS)).toEqual({});
  });

  it.each(['HIGH', 'MEDIUM', 'LOW'] as const)('chip mức %s đặt riskLevel', (level) => {
    expect(toHistoryQuery({ ...EMPTY_FILTERS, quick: level })).toEqual({ riskLevel: level });
  });

  it('chip "Lỗi" đặt status=FAILED, không đặt riskLevel', () => {
    expect(toHistoryQuery({ ...EMPTY_FILTERS, quick: 'FAILED' })).toEqual({ status: 'FAILED' });
  });

  it('khoảng ngày tính trọn cả hai ngày đầu mút theo giờ của máy', () => {
    const filters: HistoryFilters = {
      ...EMPTY_FILTERS,
      from: new Date(2026, 9, 1, 15, 30),
      to: new Date(2026, 9, 10, 8, 0),
    };
    const query = toHistoryQuery(filters);
    expect(query.from).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).toISOString());
    expect(query.to).toBe(new Date(2026, 9, 10, 23, 59, 59, 999).toISOString());
  });

  it('số người gọi được bỏ khoảng trắng hai đầu; rỗng thì không gửi', () => {
    expect(toHistoryQuery({ ...EMPTY_FILTERS, callerNumber: '  0901 ' })).toEqual({ callerNumber: '0901' });
    expect(toHistoryQuery({ ...EMPTY_FILTERS, callerNumber: '   ' })).toEqual({});
  });

  it('kết hợp nhiều bộ lọc', () => {
    const query = toHistoryQuery({
      quick: 'HIGH',
      from: new Date(2026, 9, 1),
      to: null,
      callerNumber: '987',
    });
    expect(query).toEqual({
      riskLevel: 'HIGH',
      from: new Date(2026, 9, 1, 0, 0, 0, 0).toISOString(),
      callerNumber: '987',
    });
  });

  it('nhận biết bộ lọc đang bật', () => {
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false);
    expect(hasAnyFilter({ ...EMPTY_FILTERS, quick: 'LOW' })).toBe(true);
    expect(hasAdvancedFilters({ ...EMPTY_FILTERS, quick: 'LOW' })).toBe(false);
    expect(hasAdvancedFilters({ ...EMPTY_FILTERS, callerNumber: '09' })).toBe(true);
    expect(hasAdvancedFilters({ ...EMPTY_FILTERS, to: new Date() })).toBe(true);
  });
});

describe('givenName và formatDate', () => {
  it('lấy tên (từ cuối) của họ tên tiếng Việt', () => {
    expect(givenName('Nguyễn Văn An')).toBe('An');
    expect(givenName('  Trần   Thị  Bích Ngọc ')).toBe('Ngọc');
    expect(givenName('An')).toBe('An');
    expect(givenName('')).toBe('');
    expect(givenName(null)).toBe('');
  });

  it('định dạng ngày dd/MM/yyyy', () => {
    expect(formatDate(new Date(2026, 9, 5))).toBe('05/10/2026');
    expect(formatDate(null)).toBe('');
  });
});

function summary(overrides: Partial<AnalysisSummary> = {}): AnalysisSummary {
  return {
    id: 'a1',
    status: 'COMPLETED',
    errorCode: null,
    errorMessage: null,
    completedAt: '2026-10-10T06:16:02Z',
    riskScore: 97,
    riskLevel: 'HIGH',
    confidence: 0.98,
    indicators: ['LEGAL_THREAT', 'SECRECY_DEMAND', 'URGENCY', 'OTP_REQUEST'],
    transcript: null,
    details: null,
    ...overrides,
  };
}

function call(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    callId: 'c1',
    callerNumber: '+84901234567',
    callerBlacklisted: false,
    calledAt: null,
    source: 'UPLOADED',
    createdAt: new Date(2026, 9, 10, 13, 15).toISOString(),
    durationSeconds: 150.2,
    analysis: summary(),
    owner: null,
    ...overrides,
  };
}

describe('CallRow', () => {
  it('cuộc gọi đã phân tích: số, mức, ngày giờ, thời lượng, hai dấu hiệu đầu và "+N"', async () => {
    const onPress = jest.fn();
    await render(<CallRow call={call()} onPress={onPress} />);

    expect(screen.getByText('+84901234567')).toBeTruthy();
    expect(screen.getByText('Nguy cơ cao')).toBeTruthy();
    expect(screen.getByText('10/10/2026 13:15 · 2 phút 30 giây')).toBeTruthy();
    expect(screen.getByText('Đe dọa pháp lý · Yêu cầu giữ bí mật · +2')).toBeTruthy();
    expect(screen.queryByLabelText('Số trong danh sách đen')).toBeNull();

    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('đúng hai dấu hiệu thì không có "+N"; không có dấu hiệu thì không có dòng thứ ba', async () => {
    await render(
      <CallRow call={call({ analysis: summary({ indicators: ['URGENCY', 'OTP_REQUEST'] }) })} onPress={jest.fn()} />,
    );
    expect(screen.getByText('Thúc giục · Đòi mã OTP')).toBeTruthy();
    // Số điện thoại cũng bắt đầu bằng "+", nên chỉ tìm "+N" đứng sau dấu ngăn cách.
    expect(screen.queryByText(/· \+\d/)).toBeNull();
  });

  it('không rõ số, không rõ thời lượng', async () => {
    await render(
      <CallRow call={call({ callerNumber: null, durationSeconds: null })} onPress={jest.fn()} />,
    );
    expect(screen.getByText('Không rõ số')).toBeTruthy();
    expect(screen.getByText('10/10/2026 13:15')).toBeTruthy();
  });

  it('ưu tiên thời điểm cuộc gọi nếu người dùng đã nhập', async () => {
    await render(
      <CallRow call={call({ calledAt: new Date(2026, 9, 9, 8, 5).toISOString() })} onPress={jest.fn()} />,
    );
    expect(screen.getByText('09/10/2026 08:05 · 2 phút 30 giây')).toBeTruthy();
  });

  it('số trong danh sách đen có biểu tượng cấm', async () => {
    await render(<CallRow call={call({ callerBlacklisted: true })} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Số trong danh sách đen')).toBeTruthy();
  });

  it.each(['PENDING', 'PROCESSING'] as const)('%s: Tag "Đang phân tích", không có mức hay dấu hiệu', async (status) => {
    await render(
      <CallRow
        call={call({ analysis: summary({ status, riskLevel: null, riskScore: null, indicators: null }) })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Đang phân tích')).toBeTruthy();
    expect(screen.queryByText('Nguy cơ cao')).toBeNull();
  });

  it('FAILED: Tag "Lỗi", không hiện mức rủi ro', async () => {
    await render(
      <CallRow
        call={call({
          analysis: summary({ status: 'FAILED', errorCode: 'NO_SPEECH_DETECTED', riskLevel: null, riskScore: null, indicators: null }),
        })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Lỗi')).toBeTruthy();
    for (const label of ['Nguy cơ cao', 'Đáng ngờ', 'Chưa thấy dấu hiệu']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('chưa phân tích lần nào', async () => {
    await render(<CallRow call={call({ analysis: null })} onPress={jest.fn()} />);
    expect(screen.getByText('Chưa phân tích')).toBeTruthy();
  });

  it.each([
    ['MEDIUM', 'Đáng ngờ'],
    ['LOW', 'Chưa thấy dấu hiệu'],
  ] as const)('mức %s hiện nhãn "%s"', async (riskLevel, label) => {
    await render(<CallRow call={call({ analysis: summary({ riskLevel, indicators: [] }) })} onPress={jest.fn()} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
