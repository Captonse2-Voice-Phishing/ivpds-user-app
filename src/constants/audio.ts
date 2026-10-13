export const ALLOWED_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'webm',
  '3gp',
  'amr',
  'flac',
] as const;

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

// Kiểu MIME gửi kèm file khi bộ chọn file không cho biết.
export const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  '3gp': 'audio/3gpp',
  amr: 'audio/amr',
  flac: 'audio/flac',
};

// Bộ chọn file lọc theo audio/*; thêm hai kiểu mà Android gán cho .3gp và .ogg.
export const AUDIO_PICKER_TYPES = ['audio/*', 'video/3gpp', 'application/ogg'];
