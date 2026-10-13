import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { submitReport } from '../../api/blacklist';
import { toApiError } from '../../api/errors';
import { queryKeys } from '../../api/queryKeys';
import type { BlacklistReport, SubmitReportRequest } from '../../api/types';
import { Button, Card, Icon, Notice, Screen, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { REPORT_ERRORS, REPORT_REASON_MAX_LENGTH } from '../../constants/reports';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors, typography } from '../../theme';

const STACK_EDGES = ['left', 'right', 'bottom'] as const;

export function ReportNumberScreen({ navigation, route }: RootStackScreenProps<'ReportNumber'>) {
  const callId = route.params?.callId;
  // Đi từ một cuộc gọi thì số chỉ để xem; backend tự lấy số người gọi của cuộc gọi đó.
  const fromCall = Boolean(callId);
  const queryClient = useQueryClient();

  const [phoneNumber, setPhoneNumber] = useState(route.params?.phoneNumber ?? '');
  const [reason, setReason] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<BlacklistReport | null>(null);

  const report = useMutation({
    mutationFn: submitReport,
    onSuccess: (data) => {
      setCreated(data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError.code === 'INVALID_PHONE_NUMBER' && !fromCall) {
        setPhoneError('Số điện thoại không hợp lệ');
      } else if (apiError.code === 'INVALID_PHONE_NUMBER') {
        setFormError('Cuộc gọi này không có số người gọi để báo cáo.');
      } else if (apiError.code === 'VALIDATION_FAILED') {
        setFormError(`Lý do tối đa ${REPORT_REASON_MAX_LENGTH} ký tự.`);
      } else {
        setFormError(apiErrorMessage(apiError, REPORT_ERRORS));
      }
    },
  });

  const submit = () => {
    setPhoneError(null);
    setFormError(null);
    const trimmedReason = reason.trim();
    const body: SubmitReportRequest = fromCall ? { callId } : { phoneNumber: phoneNumber.trim() };
    if (!fromCall && !body.phoneNumber) {
      setPhoneError('Vui lòng nhập số điện thoại');
      return;
    }
    if (trimmedReason) body.reason = trimmedReason;
    report.mutate(body);
  };

  if (created) {
    return (
      <Screen edges={STACK_EDGES} contentStyle={styles.centered}>
        <Card style={styles.successCard}>
          <Icon name="checkmark-circle" size={56} color={colors.success} />
          <Text style={[typography.heading, styles.textCenter]}>Đã gửi báo cáo</Text>
          <Text style={[typography.bodyStrong, styles.textCenter]}>{created.phoneNumber}</Text>
          <Text style={[styles.muted, styles.textCenter]}>
            Quản trị viên sẽ xem xét báo cáo trước khi chặn số.
          </Text>
        </Card>
        <Button title="Xem báo cáo của tôi" icon="document-text-outline" onPress={() => navigation.replace('MyReports')} />
        <Button title="Xong" variant="secondary" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen edges={STACK_EDGES}>
      <TextField
        label="Số điện thoại"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        error={phoneError}
        editable={!fromCall}
        keyboardType="phone-pad"
        maxLength={30}
        hint={fromCall ? 'Số người gọi của cuộc gọi bạn đang xem.' : undefined}
      />
      <TextField
        label="Lý do (không bắt buộc)"
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={REPORT_REASON_MAX_LENGTH}
        placeholder="Ví dụ: tự xưng công an, yêu cầu chuyển tiền"
        hint={`${reason.length}/${REPORT_REASON_MAX_LENGTH}`}
      />
      <Notice message="Quản trị viên sẽ xem xét báo cáo trước khi chặn số." />
      {formError ? <Notice tone="danger" message={formError} /> : null}
      <Button title="Gửi báo cáo" icon="flag" onPress={submit} loading={report.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: 'center' },
  successCard: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  muted: { ...typography.body, color: colors.textSecondary },
});
