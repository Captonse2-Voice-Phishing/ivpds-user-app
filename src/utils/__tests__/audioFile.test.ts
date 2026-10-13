import { ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_BYTES } from '../../constants/audio';
import {
  audioMimeType,
  fileExtension,
  meterLevel,
  recordingFileName,
  validateAudioFile,
} from '../audioFile';

describe('audioMimeType', () => {
  it('giữ kiểu MIME cụ thể mà bộ chọn file trả về', () => {
    expect(audioMimeType('a.wav', 'audio/x-wav')).toBe('audio/x-wav');
  });

  it('kiểu chung chung hoặc thiếu thì suy ra từ đuôi file', () => {
    expect(audioMimeType('a.mp3', 'application/octet-stream')).toBe('audio/mpeg');
    expect(audioMimeType('GHI.M4A', null)).toBe('audio/mp4');
    expect(audioMimeType('a.3gp', undefined)).toBe('audio/3gpp');
    expect(audioMimeType('la.xyz', undefined)).toBe('application/octet-stream');
  });
});

describe('recordingFileName', () => {
  it('có đuôi .m4a và qua được kiểm tra đuôi file', () => {
    const name = recordingFileName(new Date(2026, 9, 10, 13, 5, 9));
    expect(name).toBe('ghi-am-20261010-130509.m4a');
    expect(validateAudioFile({ name, size: 1000 })).toBeNull();
  });
});

describe('meterLevel', () => {
  it('đổi dBFS thành tỉ lệ 0–1', () => {
    expect(meterLevel(0)).toBe(1);
    expect(meterLevel(-30)).toBe(0.5);
    expect(meterLevel(-60)).toBe(0);
  });

  it('kẹp giá trị ngoài khoảng và bỏ qua giá trị thiếu', () => {
    expect(meterLevel(-160)).toBe(0);
    expect(meterLevel(6)).toBe(1);
    expect(meterLevel(undefined)).toBe(0);
    expect(meterLevel(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('fileExtension', () => {
  it.each([
    ['cuoc-goi.m4a', 'm4a'],
    ['GHI AM.MP3', 'mp3'],
    ['a.b.c.wav', 'wav'],
    ['khong-co-duoi', ''],
    ['.m4a', ''],
    ['ket-thuc-bang-cham.', ''],
  ])('%p → %p', (name, expected) => {
    expect(fileExtension(name)).toBe(expected);
  });
});

describe('validateAudioFile', () => {
  it.each([...ALLOWED_AUDIO_EXTENSIONS])('chấp nhận đuôi .%s', (extension) => {
    expect(validateAudioFile({ name: `ghi-am.${extension}`, size: 1000 })).toBeNull();
  });

  it('chấp nhận đuôi viết hoa', () => {
    expect(validateAudioFile({ name: 'GHI-AM.WAV', size: 1000 })).toBeNull();
  });

  it.each(['video.mp4', 'tai-lieu.pdf', 'khong-co-duoi', 'gia-mao.mp3.exe'])(
    'từ chối %p',
    (name) => {
      expect(validateAudioFile({ name, size: 1000 })).toBe('UNSUPPORTED_AUDIO_FORMAT');
    },
  );

  it('chấp nhận đúng 50 MB và từ chối khi lớn hơn 1 byte', () => {
    expect(validateAudioFile({ name: 'a.mp3', size: MAX_AUDIO_BYTES })).toBeNull();
    expect(validateAudioFile({ name: 'a.mp3', size: MAX_AUDIO_BYTES + 1 })).toBe('PAYLOAD_TOO_LARGE');
  });

  it('từ chối file rỗng', () => {
    expect(validateAudioFile({ name: 'a.mp3', size: 0 })).toBe('EMPTY_AUDIO');
  });

  it('không rõ dung lượng thì cho qua để backend kiểm tra', () => {
    expect(validateAudioFile({ name: 'a.mp3' })).toBeNull();
    expect(validateAudioFile({ name: 'a.mp3', size: null })).toBeNull();
  });

  it('kiểm tra đuôi trước dung lượng', () => {
    expect(validateAudioFile({ name: 'a.exe', size: MAX_AUDIO_BYTES + 1 })).toBe(
      'UNSUPPORTED_AUDIO_FORMAT',
    );
  });
});
