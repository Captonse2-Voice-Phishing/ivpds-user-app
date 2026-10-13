import type { MainTabParamList, RootStackParamList } from './types';

type RouteName = keyof RootStackParamList | keyof MainTabParamList;

// Tiêu đề tiếng Việt của từng màn hình.
export const ROUTES: Record<RouteName, { title: string }> = {
  Login: { title: 'Đăng nhập' },
  Register: { title: 'Đăng ký' },
  ForgotPassword: { title: 'Quên mật khẩu' },
  ResetPassword: { title: 'Đặt lại mật khẩu' },
  Main: { title: 'IVPDS' },
  Home: { title: 'Trang chủ' },
  History: { title: 'Lịch sử' },
  Analyze: { title: 'Phân tích' },
  Lookup: { title: 'Tra cứu' },
  Account: { title: 'Tài khoản' },
  CallResult: { title: 'Kết quả cuộc gọi' },
  Notifications: { title: 'Thông báo' },
  ReportNumber: { title: 'Báo cáo số' },
  MyReports: { title: 'Báo cáo của tôi' },
  EditProfile: { title: 'Sửa hồ sơ' },
  ChangePassword: { title: 'Đổi mật khẩu' },
};
