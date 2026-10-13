import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Analyze: { mode?: 'record' | 'file' } | undefined;
  Lookup: { phoneNumber?: string } | undefined;
  Account: undefined;
};

export type RootStackParamList = {
  // Chưa đăng nhập
  Login: { notice?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  // sentAt: thời điểm (ms) gửi mã gần nhất, để đếm ngược nút gửi lại.
  ResetPassword: { email: string; sentAt: number };
  // Đã đăng nhập
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  CallResult: { callId: string };
  Notifications: undefined;
  ReportNumber: { phoneNumber?: string; callId?: string } | undefined;
  MyReports: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // Cho useNavigation() biết kiểu tham số mà không phải khai báo lại ở từng nơi.
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
