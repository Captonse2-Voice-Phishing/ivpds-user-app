// Bổ sung cho app.json: chỉ cho phép HTTP không mã hóa trên Android khi địa chỉ backend
// (EXPO_PUBLIC_API_URL) là http:// — tức bản phát triển trỏ vào máy tính. Bản dựng trỏ tới
// backend https:// thì Android chặn HTTP như mặc định.
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  const usesCleartextTraffic = apiUrl.startsWith('http://');

  return {
    ...config,
    plugins: (config.plugins ?? []).map((plugin) => {
      if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return plugin;
      const options = plugin[1] ?? {};
      return [
        'expo-build-properties',
        { ...options, android: { ...options.android, usesCleartextTraffic } },
      ];
    }),
  };
};
