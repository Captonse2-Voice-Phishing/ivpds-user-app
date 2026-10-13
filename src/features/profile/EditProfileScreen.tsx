import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text } from 'react-native';

import { toApiError } from '../../api/errors';
import { getProfile, updateProfile } from '../../api/profile';
import { queryKeys } from '../../api/queryKeys';
import type { UpdateProfileRequest, UserProfile } from '../../api/types';
import { useSessionStore } from '../../auth/sessionStore';
import { Button, Card, ErrorState, Notice, Screen, Skeleton, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { FIELD_MESSAGES, serverFieldErrors } from '../../constants/fieldMessages';
import type { RootStackScreenProps } from '../../navigation/types';
import { typography } from '../../theme';
import { validateFullName } from '../../utils/validation';

const STACK_EDGES = ['left', 'right', 'bottom'] as const;

export function EditProfileScreen({ navigation }: RootStackScreenProps<'EditProfile'>) {
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });

  if (profile.isPending) {
    return (
      <Screen edges={STACK_EDGES}>
        <Card>
          <Skeleton height={20} width="40%" />
          <Skeleton height={44} />
          <Skeleton height={20} width="40%" />
          <Skeleton height={44} />
        </Card>
      </Screen>
    );
  }

  if (!profile.data) {
    return (
      <Screen edges={STACK_EDGES} contentStyle={{ justifyContent: 'center' }}>
        <ErrorState
          message={apiErrorMessage(toApiError(profile.error))}
          onRetry={() => void profile.refetch()}
          retrying={profile.isRefetching}
        />
      </Screen>
    );
  }

  // Form chỉ được dựng khi đã có hồ sơ, nên giá trị ban đầu luôn là dữ liệu thật.
  return <EditProfileForm profile={profile.data} onDone={() => navigation.goBack()} />;
}

function EditProfileForm({ profile, onDone }: { profile: UserProfile; onDone: () => void }) {
  const queryClient = useQueryClient();
  const updateUserName = useSessionStore((state) => state.updateUserName);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile, updated);
      updateUserName(updated.fullName);
      onDone();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'INVALID_PHONE_NUMBER') {
        setFieldErrors({ phoneNumber: FIELD_MESSAGES.phoneInvalid });
      } else if (apiError.code === 'VALIDATION_FAILED') {
        setFieldErrors(serverFieldErrors(apiError));
      } else {
        setFormError(apiErrorMessage(apiError));
      }
    },
  });

  const submit = () => {
    setFormError(null);
    const nameError = validateFullName(fullName);
    setFieldErrors(nameError ? { fullName: nameError } : {});
    if (nameError) return;

    // Chỉ gửi trường đã đổi.
    const changes: UpdateProfileRequest = {};
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    if (trimmedName !== profile.fullName) changes.fullName = trimmedName;
    if (trimmedPhone !== (profile.phoneNumber ?? '')) changes.phoneNumber = trimmedPhone;
    if (Object.keys(changes).length === 0) {
      onDone();
      return;
    }
    save.mutate(changes);
  };

  return (
    <Screen edges={STACK_EDGES}>
      {formError ? <Notice tone="danger" message={formError} /> : null}
      <TextField
        label="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.fullName}
        autoCapitalize="words"
        autoComplete="name"
        maxLength={100}
      />
      <TextField
        label="Số điện thoại"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        error={fieldErrors.phoneNumber}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={30}
        hint="Để trống nếu không muốn lưu số."
      />
      <TextField label="Email" value={profile.email} editable={false} hint="Email không đổi được." />
      <Button title="Lưu" icon="checkmark" onPress={submit} loading={save.isPending} />
      <Text style={typography.small}>Số điện thoại sẽ được lưu ở dạng quốc tế, ví dụ +84901234567.</Text>
    </Screen>
  );
}
