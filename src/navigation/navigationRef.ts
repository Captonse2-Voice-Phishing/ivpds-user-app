import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

// Cho phép điều hướng từ ngoài cây component (khi người dùng bấm vào một thông báo đẩy).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
