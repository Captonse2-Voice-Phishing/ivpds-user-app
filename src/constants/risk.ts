import type { RiskLevel } from '../api/types';
import type { IconName } from '../components/Icon';
import type { Tone } from '../theme';

export interface RiskLevelInfo {
  label: string;
  tone: Tone;
  icon: IconName;
  advice: string;
}

// Mức rủi ro luôn lấy từ backend; ở đây chỉ có nhãn, màu và lời khuyên để hiển thị.
export const RISK_LEVELS: Record<RiskLevel, RiskLevelInfo> = {
  HIGH: {
    label: 'Nguy cơ cao',
    tone: 'danger',
    icon: 'warning',
    advice:
      'Cuộc gọi này có nhiều dấu hiệu lừa đảo. Không đọc mã OTP, mật khẩu và không chuyển tiền theo yêu cầu của người gọi.',
  },
  MEDIUM: {
    label: 'Đáng ngờ',
    tone: 'warning',
    icon: 'alert-circle',
    advice:
      'Cuộc gọi có dấu hiệu đáng ngờ. Hãy kiểm tra lại qua kênh chính thức trước khi làm theo yêu cầu.',
  },
  LOW: {
    label: 'Chưa thấy dấu hiệu',
    tone: 'success',
    icon: 'checkmark-circle',
    advice:
      'Chưa phát hiện dấu hiệu lừa đảo rõ ràng. Kết quả do máy đánh giá, bạn vẫn nên cẩn thận.',
  },
};
