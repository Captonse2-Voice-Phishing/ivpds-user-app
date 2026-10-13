import * as SecureStore from 'expo-secure-store';

// Refresh token chỉ nằm trong SecureStore (Keystore/Keychain), không dùng AsyncStorage.
const REFRESH_TOKEN_KEY = 'ivpds.refreshToken';

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // Lỗi đọc có thể chỉ là tạm thời (kho khóa đang bận lúc vừa mở máy): thử lại một lần
    // để người dùng không bị coi như đã đăng xuất.
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Vẫn không đọc được (khóa bị vô hiệu...) thì coi như chưa đăng nhập.
      return null;
    }
  }
}

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // Xóa lỗi không được chặn việc đăng xuất.
  }
}
