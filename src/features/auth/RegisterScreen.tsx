import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import * as authApi from '../../api/auth';
import { toApiError } from '../../api/errors';
import { startSession } from '../../auth/session';
import { Button, Notice, Screen, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { serverFieldErrors } from '../../constants/fieldMessages';
import type { RootStackScreenProps } from '../../navigation/types';
import {
  validateEmail,
  validateFullName,
  validateNewPassword,
  validateOptionalRegisterPhone,
  validatePasswordConfirm,
} from '../../utils/validation';

export function RegisterScreen({ navigation }: RootStackScreenProps<'Register'>) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Đăng ký xong backend trả luôn token: vào thẳng ứng dụng.
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: startSession,
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'EMAIL_ALREADY_REGISTERED') {
        setFieldErrors({ email: 'Email này đã được đăng ký' });
      } else if (apiError.code === 'VALIDATION_FAILED') {
        setFieldErrors(serverFieldErrors(apiError));
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
    const phoneResult = validateOptionalRegisterPhone(phone);
    add('fullName', validateFullName(fullName));
    add('email', validateEmail(email));
    add('phoneNumber', phoneResult.error);
    add('password', validateNewPassword(password));
    add('confirm', validatePasswordConfirm(password, confirm));
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    register.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      phoneNumber: phoneResult.phoneNumber,
    });
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      {formError ? <Notice message={formError} tone="danger" /> : null}

      <TextField
        label="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.fullName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={100}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
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
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <TextField
        ref={phoneRef}
        label="Số điện thoại (không bắt buộc)"
        value={phone}
        onChangeText={setPhone}
        error={fieldErrors.phoneNumber}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
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
        label="Nhập lại mật khẩu"
        value={confirm}
        onChangeText={setConfirm}
        error={fieldErrors.confirm}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button title="Đăng ký" onPress={submit} loading={register.isPending} />
      <Button title="Đã có tài khoản? Đăng nhập" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
