import { API_PREFIX } from './config';
import { publicClient } from './publicClient';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './types';

const AUTH = `${API_PREFIX}/auth`;

export async function register(body: RegisterRequest): Promise<AuthResponse> {
  const response = await publicClient.post<AuthResponse>(`${AUTH}/register`, body);
  return response.data;
}

export async function login(body: LoginRequest): Promise<AuthResponse> {
  const response = await publicClient.post<AuthResponse>(`${AUTH}/login`, body);
  return response.data;
}

// Refresh token chỉ dùng được một lần; dùng lại token cũ làm cả phiên bị thu hồi.
export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const response = await publicClient.post<AuthResponse>(`${AUTH}/refresh`, { refreshToken });
  return response.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await publicClient.post(`${AUTH}/logout`, { refreshToken });
}

// Backend luôn trả 204, kể cả khi email không tồn tại.
export async function forgotPassword(body: ForgotPasswordRequest): Promise<void> {
  await publicClient.post(`${AUTH}/forgot-password`, body);
}

export async function resetPassword(body: ResetPasswordRequest): Promise<void> {
  await publicClient.post(`${AUTH}/reset-password`, body);
}
