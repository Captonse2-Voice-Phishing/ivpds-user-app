import type { ApiError } from '../api/errors';
import { lookup } from '../utils/object';

// Câu báo lỗi dưới từng ô nhập — dùng cho cả kiểm tra ở máy lẫn lỗi backend trả về.
export const FIELD_MESSAGES = {
  emailRequired: 'Vui lòng nhập email',
  emailInvalid: 'Email không hợp lệ',
  passwordRequired: 'Vui lòng nhập mật khẩu',
  passwordLength: 'Mật khẩu cần 8–72 ký tự',
  passwordMismatch: 'Mật khẩu nhập lại không khớp',
  fullNameRequired: 'Vui lòng nhập họ tên',
  fullNameTooLong: 'Họ tên tối đa 100 ký tự',
  phoneInvalid: 'Số điện thoại không hợp lệ',
  codeInvalid: 'Mã gồm 6 chữ số',
  currentPasswordRequired: 'Vui lòng nhập mật khẩu hiện tại',
  fullNameInvalid: 'Họ tên không hợp lệ (1–100 ký tự)',
  generic: 'Giá trị không hợp lệ',
} as const;

// `fieldErrors` của backend viết bằng tiếng Anh nên không hiện nguyên văn:
// mỗi trường có một câu tiếng Việt cố định.
const SERVER_FIELD_MESSAGES: Record<string, string> = {
  email: FIELD_MESSAGES.emailInvalid,
  password: FIELD_MESSAGES.passwordLength,
  newPassword: FIELD_MESSAGES.passwordLength,
  currentPassword: FIELD_MESSAGES.currentPasswordRequired,
  fullName: 'Họ tên không hợp lệ (1–100 ký tự)',
  phoneNumber: FIELD_MESSAGES.phoneInvalid,
  code: FIELD_MESSAGES.codeInvalid,
};

// Trả { tênTrường: câu tiếng Việt } cho lỗi VALIDATION_FAILED.
export function serverFieldErrors(
  error: ApiError,
  overrides?: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { field } of error.fieldErrors) {
    result[field] =
      (overrides ? lookup(overrides, field) : undefined) ??
      lookup(SERVER_FIELD_MESSAGES, field) ??
      FIELD_MESSAGES.generic;
  }
  return result;
}
