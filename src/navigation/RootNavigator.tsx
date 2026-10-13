import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSessionStore } from '../auth/sessionStore';
import { ForgotPasswordScreen } from '../features/auth/ForgotPasswordScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { ChangePasswordScreen } from '../features/profile/ChangePasswordScreen';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { MyReportsScreen } from '../features/reports/MyReportsScreen';
import { ReportNumberScreen } from '../features/reports/ReportNumberScreen';
import { CallResultScreen } from '../features/result/CallResultScreen';
import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import { ROUTES } from './routes';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const signedIn = useSessionStore((state) => state.status === 'signedIn');

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontSize: 20, fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {signedIn ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="CallResult" component={CallResultScreen} options={{ title: ROUTES.CallResult.title }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: ROUTES.Notifications.title }} />
          <Stack.Screen name="ReportNumber" component={ReportNumberScreen} options={{ title: ROUTES.ReportNumber.title }} />
          <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: ROUTES.MyReports.title }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: ROUTES.EditProfile.title }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: ROUTES.ChangePassword.title }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: ROUTES.Register.title }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: ROUTES.ForgotPassword.title }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: ROUTES.ResetPassword.title }} />
        </>
      )}
    </Stack.Navigator>
  );
}
