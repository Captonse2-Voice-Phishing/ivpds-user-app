// Kiểu dữ liệu theo API của backend IVPDS. Trường không có giá trị là null, không bị bỏ đi.

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CallSource = 'RECORDED' | 'UPLOADED' | 'LIVE';
export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type NotificationType = 'HIGH_RISK_CALL' | 'SUSPICIOUS_CALL' | 'BLACKLISTED_CALLER';
export type DevicePlatform = 'ANDROID' | 'IOS';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  requestId: string | null;
  fieldErrors?: FieldError[] | null;
}

// Xác thực
export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Hồ sơ
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  status: UserStatus;
  blacklistAlertEnabled: boolean;
  roles: string[];
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  blacklistAlertEnabled?: boolean;
}

// Cuộc gọi và phân tích
export interface CallAudio {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  checksumSha256: string;
}

export interface Call {
  id: string;
  callerNumber: string | null;
  calledAt: string | null;
  source: CallSource;
  createdAt: string;
  audio: CallAudio | null;
}

export interface AnalysisDetails {
  sttModel: string | null;
  modelProbability: number | null;
  nlpModelVersion: string | null;
  rulesetVersion: string | null;
  riskEngineVersion: string | null;
}

export interface Analysis {
  id: string;
  callId: string;
  status: AnalysisStatus;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  transcript: string | null;
  language: string | null;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  confidence: number | null;
  // Mã dấu hiệu; backend có thể thêm mã mới nên để string.
  indicators: string[] | null;
  details: AnalysisDetails | null;
}

export interface AnalysisSummary {
  id: string;
  status: AnalysisStatus;
  errorCode: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  confidence: number | null;
  indicators: string[] | null;
  transcript: string | null;
  details: AnalysisDetails | null;
}

export interface HistoryItem {
  callId: string;
  callerNumber: string | null;
  callerBlacklisted: boolean;
  calledAt: string | null;
  source: CallSource;
  createdAt: string;
  durationSeconds: number | null;
  analysis: AnalysisSummary | null;
  owner: null;
}

export interface HistoryQuery {
  riskLevel?: RiskLevel;
  status?: AnalysisStatus;
  from?: string;
  to?: string;
  callerNumber?: string;
  page?: number;
  size?: number;
}

// Danh sách đen và báo cáo
export interface BlacklistLookup {
  phoneNumber: string;
  blacklisted: boolean;
  reason: string | null;
  since: string | null;
}

export interface SubmitReportRequest {
  phoneNumber?: string;
  callId?: string;
  reason?: string;
}

export interface BlacklistReport {
  id: string;
  phoneNumber: string;
  callId: string | null;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
}

// Thông báo
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  analysisId: string | null;
  callId: string | null;
  createdAt: string;
}

export interface UnreadCount {
  unreadCount: number;
}

export interface MarkAllReadResult {
  marked: number;
}

export interface DeviceRegisterRequest {
  token: string;
  platform: DevicePlatform;
}

export interface PushData {
  notificationId: string;
  type: NotificationType;
  callId: string | null;
  analysisId: string | null;
}

export interface HealthResponse {
  status: string;
}
