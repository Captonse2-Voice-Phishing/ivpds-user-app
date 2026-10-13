import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import * as authApi from '../../api/auth';
import { toApiError } from '../../api/errors';
import { Button, CodeInput, Notice, Screen, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { serverFieldErrors } from '../../constants/fieldMessages';
import type { RootStackScreenProps } from '../../navigation/types';
import {
  validateNewPassword,
  validatePasswordConfirm,
  validateResetCode,
} from '../../utils/validation';

// Backend không gửi thêm mail trong 60 giây sau mỗi lần gửi.
const RESEND_COOLDOWN_MS = 60_000;

const RESET_ERRORS = { INVALID_RESET_CODE: 'Mã không đúng hoặc đã hết hạn' };

// Bước 2: nhập mã 6 số và mật khẩu mới.
export function ResetPasswordScreen({ navigation, route }: RootStackScreenProps<'ResetPassword'>) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const confirmRef = useRef<TextInput>(null);

  // Đếm ngược cho nút "Gửi lại mã".
  const [resendAt, setResendAt] = useState(route.params.sentAt + RESEND_COOLDOWN_MS);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= resendAt) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [resendAt]);
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const resend = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      const current = Date.now();
      setNow(current);
      setResendAt(current + RESEND_COOLDOWN_MS);
    },
    onError: (error) => setFormError(apiErrorMessage(toApiError(error))),
  });

  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      navigation.popTo('Login', {
        notice: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.',
      });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'INVALID_RESET_CODE') {
        setFieldErrors({ code: RESET_ERRORS.INVALID_RESET_CODE });
      } else if (apiError.code === 'VALIDATION_FAILED') {
        const mapped = serverFieldErrors(apiError);
        setFieldErrors({ ...mapped, ...(mapped.newPassword ? { password: mapped.newPassword } : {}) });
      } else {
        setFormError(apiErrorMessage(apiError));
      }
    },
  });

  const submit = () => {
    const errors: Record<string, string> = {};
    const add = (field: string, message: string | null) => {
      if (message) errors[field] = message;
    };
    add('code', validateResetCode(code));
    add('password', validateNewPassword(password));
    add('confirm', validatePasswordConfirm(password, confirm));
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;
    reset.mutate({ email, code, newPassword: password });
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Notice message="Nếu email tồn tại, chúng tôi đã gửi mã 6 số. Mã có hiệu lực 15 phút." />
      {formError ? <Notice message={formError} tone="danger" /> : null}

      <CodeInput label="Mã 6 số" value={code} onChange={setCode} error={fieldErrors.code} />
      <Button
        title={secondsLeft > 0 ? `Gửi lại mã (${secondsLeft} giây)` : 'Gửi lại mã'}
        variant="ghost"
        disabled={secondsLeft > 0}
        loading={resend.isPending}
        onPress={() => {
          setFormError(null);
          resend.mutate({ email });
        }}
      />

      <TextField
        label="Mật khẩu mới"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        hint="8–72 ký tự"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Nhập lại mật khẩu mới"
        value={confirm}
        onChangeText={setConfirm}
        error={fieldErrors.confirm}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button title="Đặt lại mật khẩu" onPress={submit} loading={reset.isPending} />
    </Screen>
  );
}
