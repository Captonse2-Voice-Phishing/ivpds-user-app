import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text } from 'react-native';

import * as authApi from '../../api/auth';
import { toApiError } from '../../api/errors';
import { Button, Notice, Screen, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { serverFieldErrors } from '../../constants/fieldMessages';
import type { RootStackScreenProps } from '../../navigation/types';
import { typography } from '../../theme';
import { validateEmail } from '../../utils/validation';

// Bước 1: nhập email để nhận mã 6 số.
export function ForgotPasswordScreen({ navigation }: RootStackScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: authApi.forgotPassword,
    // Backend luôn trả 204 dù email có tồn tại hay không: luôn sang bước 2.
    onSuccess: (_data, variables) => {
      navigation.navigate('ResetPassword', { email: variables.email, sentAt: Date.now() });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'VALIDATION_FAILED') {
        setEmailError(serverFieldErrors(apiError).email ?? null);
      } else {
        setFormError(apiErrorMessage(apiError));
      }
    },
  });

  const submit = () => {
    const error = validateEmail(email);
    setEmailError(error);
    setFormError(null);
    if (error) return;
    request.mutate({ email: email.trim() });
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Text style={typography.body}>
        Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi một mã 6 số để đặt lại mật khẩu.
      </Text>
      {formError ? <Notice message={formError} tone="danger" /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Button title="Gửi mã" onPress={submit} loading={request.isPending} />
    </Screen>
  );
}
