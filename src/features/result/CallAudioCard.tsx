import { useMutation } from '@tanstack/react-query';
import { Text } from 'react-native';

import { downloadCallAudio, getCall } from '../../api/calls';
import { ApiError, toApiError } from '../../api/errors';
import { AudioPlayer, Button, Card, Notice } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { typography } from '../../theme';
import { fileExtension } from '../../utils/audioFile';

interface CallAudioCardProps {
  callId: string;
  durationSeconds: number | null;
}

// Nghe lại ghi âm. File chỉ được tải về khi người dùng bấm nghe, rồi phát từ bộ nhớ máy.
export function CallAudioCard({ callId, durationSeconds }: CallAudioCardProps) {
  const download = useMutation({
    mutationFn: async () => {
      // Lấy tên file gốc để giữ đúng đuôi (trình phát dựa vào đuôi để nhận định dạng).
      const call = await getCall(callId);
      if (!call.audio) throw new ApiError({ code: 'CALL_HAS_NO_AUDIO' });
      return downloadCallAudio(callId, fileExtension(call.audio.originalFilename));
    },
  });

  return (
    <Card>
      <Text style={typography.title}>Nghe lại ghi âm</Text>
      {download.data ? (
        <AudioPlayer key={download.data} uri={download.data} knownDurationSeconds={durationSeconds} />
      ) : (
        <>
          {download.isError ? (
            <Notice tone="danger" message={apiErrorMessage(toApiError(download.error))} />
          ) : null}
          <Button
            title={download.isError ? 'Thử lại' : 'Tải ghi âm để nghe'}
            variant="secondary"
            icon="play-circle-outline"
            loading={download.isPending}
            onPress={() => download.mutate()}
          />
        </>
      )}
    </Card>
  );
}
