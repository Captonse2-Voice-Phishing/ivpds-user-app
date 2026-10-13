import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { lookupNumber } from '../../api/blacklist';
import { toApiError } from '../../api/errors';
import { queryKeys } from '../../api/queryKeys';
import type { BlacklistLookup } from '../../api/types';
import { Button, Card, ErrorState, Icon, Screen, Skeleton, TextField } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, radius, spacing, toneColors, typography } from '../../theme';
import { formatDate } from '../../utils/format';

export function LookupScreen({ navigation, route }: MainTabScreenProps<'Lookup'>) {
  const [input, setInput] = useState(route.params?.phoneNumber ?? '');
  // Số đang được tra cứu; rỗng nghĩa là chưa tra.
  const [submitted, setSubmitted] = useState(route.params?.phoneNumber?.trim() ?? '');
  const [emptyError, setEmptyError] = useState(false);

  // Trang chủ chuyển sang kèm một số mới: điền sẵn và tra luôn.
  const requested = route.params?.phoneNumber;
  const [appliedRequest, setAppliedRequest] = useState(requested);
  if (requested !== appliedRequest) {
    setAppliedRequest(requested);
    if (requested) {
      setInput(requested);
      setSubmitted(requested.trim());
      setEmptyError(false);
    }
  }

  const lookup = useQuery({
    queryKey: queryKeys.blacklist.lookup(submitted),
    queryFn: () => lookupNumber(submitted),
    enabled: submitted !== '',
    // Danh sách đen có thể vừa đổi: mỗi lần tra là một lần hỏi mới.
    staleTime: 0,
  });

  const search = () => {
    const phoneNumber = input.trim();
    setEmptyError(phoneNumber === '');
    if (!phoneNumber) return;
    if (phoneNumber === submitted) void lookup.refetch();
    else setSubmitted(phoneNumber);
  };

  const error = lookup.isError ? toApiError(lookup.error) : null;
  const invalidNumber = error?.code === 'INVALID_PHONE_NUMBER';
  const fieldError = emptyError
    ? 'Vui lòng nhập số điện thoại'
    : invalidNumber
      ? 'Số điện thoại không hợp lệ'
      : null;

  return (
    <Screen>
      <Text style={typography.heading}>Tra cứu số điện thoại</Text>
      <Text style={styles.muted}>Kiểm tra một số có nằm trong danh sách đen hay không.</Text>

      <TextField
        label="Số điện thoại"
        value={input}
        onChangeText={(text) => {
          setInput(text);
          setEmptyError(false);
        }}
        error={fieldError}
        large
        keyboardType="phone-pad"
        placeholder="Ví dụ 0901234567"
        returnKeyType="search"
        onSubmitEditing={search}
        maxLength={30}
      />
      <Button title="Tra cứu" icon="search" onPress={search} loading={lookup.isFetching} />

      {submitted === '' || emptyError ? null : lookup.isPending ? (
        <Card>
          <Skeleton height={28} width="70%" />
          <Skeleton height={18} />
        </Card>
      ) : error && !invalidNumber ? (
        <Card>
          <ErrorState message={apiErrorMessage(error)} onRetry={() => void lookup.refetch()} retrying={lookup.isFetching} />
        </Card>
      ) : lookup.data && !invalidNumber ? (
        <LookupResult
          result={lookup.data}
          onReport={() => navigation.navigate('ReportNumber', { phoneNumber: lookup.data.phoneNumber })}
        />
      ) : null}

      <View style={styles.footer}>
        <Button
          title="Báo cáo của tôi"
          variant="ghost"
          icon="document-text-outline"
          onPress={() => navigation.navigate('MyReports')}
        />
      </View>
    </Screen>
  );
}

function LookupResult({ result, onReport }: { result: BlacklistLookup; onReport: () => void }) {
  const palette = toneColors[result.blacklisted ? 'danger' : 'success'];

  return (
    <View
      style={[styles.result, { backgroundColor: palette.soft, borderColor: palette.solid }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.resultHeader}>
        <Icon name={result.blacklisted ? 'ban' : 'checkmark-circle'} size={36} color={palette.solid} />
        <View style={styles.flex}>
          <Text style={[styles.resultTitle, { color: palette.text }]}>
            {result.blacklisted ? 'Số này nằm trong danh sách đen' : 'Chưa có trong danh sách đen'}
          </Text>
          {/* Số hiển thị đúng như backend trả (+84…). */}
          <Text style={typography.bodyStrong}>{result.phoneNumber}</Text>
        </View>
      </View>

      {result.blacklisted ? (
        <>
          {result.reason ? <Text style={typography.body}>Lý do: {result.reason}</Text> : null}
          {result.since ? <Text style={typography.body}>Từ ngày {formatDate(result.since)}</Text> : null}
        </>
      ) : (
        <>
          <Text style={typography.small}>Điều này không có nghĩa số này an toàn.</Text>
          <Button title="Báo cáo số này" variant="secondary" icon="flag-outline" onPress={onReport} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { ...typography.body, color: colors.textSecondary },
  result: { borderRadius: radius.card, borderWidth: 2, padding: spacing.lg, gap: spacing.md },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resultTitle: { fontSize: 20, fontWeight: '700' },
  footer: { marginTop: spacing.sm },
});
