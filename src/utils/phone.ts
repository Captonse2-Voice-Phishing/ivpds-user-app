const REGISTER_PHONE_PATTERN = /^\+?[0-9]{6,15}$/;

// API đăng ký chỉ nhận chữ số (có thể có + ở đầu): bỏ khoảng trắng, dấu chấm, gạch ngang.
export function normalizePhoneForRegister(input: string): string {
  return input.replace(/[\s.\-]/g, '');
}

export function isValidRegisterPhone(normalized: string): boolean {
  return REGISTER_PHONE_PATTERN.test(normalized);
}
