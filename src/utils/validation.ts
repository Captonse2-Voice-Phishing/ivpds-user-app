import { FIELD_MESSAGES } from '../constants/fieldMessages';
import { isValidRegisterPhone, normalizePhoneForRegister } from './phone';

// Kiểm tra ở máy trước khi gửi, theo đúng quy tắc của backend. Trả câu lỗi hoặc null.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return FIELD_MESSAGES.emailRequired;
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) return FIELD_MESSAGES.emailInvalid;
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return FIELD_MESSAGES.passwordRequired;
  if (value.length < 8 || value.length > 72) return FIELD_MESSAGES.passwordLength;
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  return password === confirm ? null : FIELD_MESSAGES.passwordMismatch;
}

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (!name) return FIELD_MESSAGES.fullNameRequired;
  if (name.length > 100) return FIELD_MESSAGES.fullNameTooLong;
  return null;
}

// Số điện thoại khi đăng ký không bắt buộc; có nhập thì chuẩn hóa rồi kiểm tra.
export function validateOptionalRegisterPhone(value: string): {
  phoneNumber: string | undefined;
  error: string | null;
} {
  const normalized = normalizePhoneForRegister(value);
  if (!normalized) return { phoneNumber: undefined, error: null };
  if (!isValidRegisterPhone(normalized)) {
    return { phoneNumber: undefined, error: FIELD_MESSAGES.phoneInvalid };
  }
  return { phoneNumber: normalized, error: null };
}

export function validateResetCode(value: string): string | null {
  return /^\d{6}$/.test(value) ? null : FIELD_MESSAGES.codeInvalid;
}
