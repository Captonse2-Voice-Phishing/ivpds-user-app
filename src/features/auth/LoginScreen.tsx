import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInput } from 'react-native';

import * as authApi from '../../api/auth';
import { toApiError } from '../../api/errors';
import { startSession } from '../../auth/session';
import { useSessionStore } from '../../auth/sessionStore';
import { Button, Notice, Screen, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { FIELD_MESSAGES, serverFieldErrors } from '../../constants/fieldMessages';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { validateEmail } from '../../utils/validation';

const LOGIN_ERRORS = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
};

// Ở màn hình này ô mật khẩu chỉ có thể sai vì bỏ trống.
const LOGIN_FIELD_OVERRIDES = { password: FIELD_MESSAGES.passwordRequired };

export function LoginScreen({ navigation, route }: RootStackScreenProps<'Login'>) {
  const sessionNotice = useSessionStore((state) => state.notice);
  const sessionNoticeTone = useSessionStore((state) => state.noticeTone);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: startSession,
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'VALIDATION_FAILED') {
        setFieldErrors(serverFieldErrors(apiError, LOGIN_FIELD_OVERRIDES));
      } else {
        setFormError(apiErrorMessage(apiError, LOGIN_ERRORS));
      }
    },
  });

  const submit = () => {
    const errors: Record<string, string> = {};
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
    if (!password) errors.password = FIELD_MESSAGES.passwordRequired;
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;
    login.mutate({ email: email.trim(), password });
  };

  const successNotice = route.params?.notice;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <Text style={styles.logo}>IVPDS</Text>
        <Text style={styles.tagline}>Phát hiện lừa đảo qua cuộc gọi</Text>
      </View>

      {/* Chỉ hiện một dải: lỗi vừa xảy ra che lời nhắn cũ. */}
      {formError ? (
        <Notice message={formError} tone="danger" />
      ) : successNotice ? (
        <Notice message={successNotice} tone="success" />
      ) : sessionNotice ? (
        <Notice message={sessionNotice} tone={sessionNoticeTone} />
      ) : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button title="Đăng nhập" onPress={submit} loading={login.isPending} />

      <View style={styles.links}>
        <Button title="Quên mật khẩu?" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} />
        <Button
          title="Chưa có tài khoản? Đăng ký"
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', padding: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  logo: { fontSize: 44, fontWeight: '800', color: colors.primary },
  tagline: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  links: { gap: spacing.xs },
});
