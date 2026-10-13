import { lookup } from '../utils/object';

export interface IndicatorInfo {
  code: string;
  label: string;
  description: string | null;
}

const INDICATORS: Record<string, { label: string; description: string }> = {
  OTP_REQUEST: {
    label: 'Đòi mã OTP',
    description: 'Người gọi yêu cầu bạn đọc mã OTP. Ngân hàng không bao giờ hỏi mã này.',
  },
  MONEY_TRANSFER: {
    label: 'Yêu cầu chuyển tiền',
    description: 'Người gọi yêu cầu bạn chuyển tiền.',
  },
  BANK_IMPERSONATION: {
    label: 'Tự xưng ngân hàng',
    description: 'Người gọi nói mình là nhân viên ngân hàng.',
  },
  URGENCY: {
    label: 'Thúc giục',
    description: 'Người gọi ép bạn làm ngay, không cho thời gian suy nghĩ.',
  },
  ACCOUNT_LOCK_THREAT: {
    label: 'Dọa khóa tài khoản',
    description: 'Người gọi dọa tài khoản của bạn sẽ bị khóa.',
  },
  SENSITIVE_INFORMATION: {
    label: 'Hỏi thông tin nhạy cảm',
    description: 'Người gọi hỏi số thẻ, mật khẩu hoặc giấy tờ tùy thân.',
  },
  AUTHORITY_IMPERSONATION: {
    label: 'Tự xưng cơ quan chức năng',
    description: 'Người gọi nói mình là công an, viện kiểm sát hoặc tòa án.',
  },
  LEGAL_THREAT: {
    label: 'Đe dọa pháp lý',
    description: 'Người gọi dọa bắt giữ, khởi tố hoặc nói bạn liên quan vụ án.',
  },
  HARM_THREAT: {
    label: 'Đe dọa gây hại',
    description: 'Người gọi đe dọa bạn hoặc người thân.',
  },
  SECRECY_DEMAND: {
    label: 'Yêu cầu giữ bí mật',
    description: 'Người gọi yêu cầu bạn không nói với ai.',
  },
  REMOTE_ACCESS_REQUEST: {
    label: 'Yêu cầu điều khiển máy',
    description: 'Người gọi yêu cầu cài ứng dụng hoặc chia sẻ màn hình.',
  },
  FINANCIAL_BAIT: {
    label: 'Dụ dỗ bằng tiền',
    description: 'Người gọi hứa trúng thưởng, hoàn tiền hoặc lãi cao.',
  },
  UNUSUAL_PAYMENT: {
    label: 'Thanh toán bất thường',
    description: 'Người gọi yêu cầu trả tiền theo cách khác thường.',
  },
  CALL_HANDOFF: {
    label: 'Chuyển máy',
    description: 'Người gọi chuyển máy cho một "cán bộ" khác.',
  },
  COORDINATED_CALLERS: {
    label: 'Nhiều người phối hợp',
    description: 'Có nhiều người ở đầu dây bên kia cùng tham gia.',
  },
};

// Mã lạ (backend thêm về sau): hiện nguyên mã, không có câu giải thích.
export function indicatorInfo(code: string): IndicatorInfo {
  const known = lookup(INDICATORS, code);
  return known ? { code, ...known } : { code, label: code, description: null };
}

export const KNOWN_INDICATOR_CODES = Object.keys(INDICATORS);
