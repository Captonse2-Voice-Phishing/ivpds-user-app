import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import { toApiError } from '../../api/errors';
import { changePassword } from '../../api/profile';
import { logout } from '../../auth/session';
import { Button, Notice, Screen, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { FIELD_MESSAGES, serverFieldErrors } from '../../constants/fieldMessages';
import { validateNewPassword, validatePasswordConfirm } from '../../utils/validation';

const STACK_EDGES = ['left', 'right', 'bottom'] as const;

export const PASSWORD_CHANGED_NOTICE = 'Đã đổi mật khẩu, vui lòng đăng nhập lại';

export function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const change = useMutation({
    mutationFn: changePassword,
    // Backend đã thu hồi mọi phiên: dọn phiên ở máy và về Đăng nhập kèm lời nhắn.
    onSuccess: () => logout(PASSWORD_CHANGED_NOTICE),
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'INVALID_CURRENT_PASSWORD') {
        setFieldErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
      } else if (apiError.code === 'VALIDATION_FAILED') {
        setFieldErrors(serverFieldErrors(apiError));
      } else {
        setFormError(apiErrorMessage(apiError));
      }
    },
  });

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!current) errors.currentPassword = FIELD_MESSAGES.currentPasswordRequired;
    const nextError = validateNewPassword(next);
    if (nextError) errors.newPassword = nextError;
    const confirmError = validatePasswordConfirm(next, confirm);
    if (confirmError) errors.confirm = confirmError;
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;
    change.mutate({ currentPassword: current, newPassword: next });
  };

  return (
    <Screen edges={STACK_EDGES}>
      <Notice message="Sau khi đổi mật khẩu, bạn sẽ phải đăng nhập lại trên mọi thiết bị." />
      {formError ? <Notice tone="danger" message={formError} /> : null}
      <TextField
        label="Mật khẩu hiện tại"
        value={current}
        onChangeText={setCurrent}
        error={fieldErrors.currentPassword}
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => nextRef.current?.focus()}
      />
      <TextField
        ref={nextRef}
        label="Mật khẩu mới"
        value={next}
        onChangeText={setNext}
        error={fieldErrors.newPassword}
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
      <Button title="Đổi mật khẩu" icon="key" onPress={submit} loading={change.isPending} />
    </Screen>
  );
}
