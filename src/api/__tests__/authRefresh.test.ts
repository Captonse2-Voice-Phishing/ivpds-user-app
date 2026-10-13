import { AxiosError, create, type AxiosAdapter, type AxiosResponse } from 'axios';

import { attachAuthRefresh } from '../authRefresh';
import { ApiError } from '../errors';

// Máy chủ giả ở tầng adapter: chỉ chấp nhận đúng một access token tại mỗi thời điểm.
function setup(options: { refreshFails?: boolean; refreshGivesBadToken?: boolean } = {}) {
  const state = {
    serverToken: 'new', // token mà "máy chủ" đang chấp nhận
    clientToken: 'old' as string | null, // token ứng dụng đang giữ (đã hết hạn)
    requests: [] as { url: string; authorization: string | null }[],
    refreshCalls: 0,
    beforeRespond: null as null | (() => void),
  };

  const adapter: AxiosAdapter = async (config) => {
    const header = config.headers.get('Authorization');
    const authorization = typeof header === 'string' ? header : null;
    state.requests.push({ url: config.url ?? '', authorization });
    await new Promise((resolve) => setTimeout(resolve, 5));
    state.beforeRespond?.();

    const respond = (status: number, data: unknown): AxiosResponse => ({
      status,
      statusText: '',
      data,
      headers: {},
      config,
    });
    if (config.url === '/boom') {
      throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, null, respond(500, { code: 'INTERNAL_ERROR' }));
    }
    if (authorization !== `Bearer ${state.serverToken}`) {
      throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, null, respond(401, { code: 'UNAUTHORIZED' }));
    }
    return respond(200, { url: config.url });
  };

  const client = create({ adapter });
  const refresh = jest.fn(async () => {
    state.refreshCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (options.refreshFails) throw new ApiError({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
    state.clientToken = options.refreshGivesBadToken ? 'still-bad' : state.serverToken;
    return state.clientToken;
  });
  const handle = attachAuthRefresh(client, { getAccessToken: () => state.clientToken, refresh });
  return { client, state, refresh, handle };
}

describe('attachAuthRefresh', () => {
  it('gắn Bearer token vào request', async () => {
    const { client, state } = setup();
    state.clientToken = 'new';
    await client.get('/a');
    expect(state.requests).toEqual([{ url: '/a', authorization: 'Bearer new' }]);
  });

  it('không có token thì không gắn header', async () => {
    const { client, state } = setup({ refreshFails: true });
    state.clientToken = null;
    await expect(client.get('/a')).rejects.toBeInstanceOf(ApiError);
    expect(state.requests[0].authorization).toBeNull();
  });

  it('nhiều request cùng 401: chỉ gọi refresh MỘT lần, tất cả được gửi lại và thành công', async () => {
    const { client, state, refresh } = setup();
    const urls = ['/a', '/b', '/c', '/d', '/e'];

    const responses = await Promise.all(urls.map((url) => client.get<{ url: string }>(url)));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(responses.map((response) => response.data.url)).toEqual(urls);
    // 5 lần đầu bằng token cũ, 5 lần gửi lại bằng token mới.
    expect(state.requests).toHaveLength(10);
    expect(state.requests.slice(0, 5).every((r) => r.authorization === 'Bearer old')).toBe(true);
    expect(state.requests.slice(5).every((r) => r.authorization === 'Bearer new')).toBe(true);
  });

  it('refresh thất bại: mọi request đang chờ đều nhận lỗi của refresh, không gửi lại', async () => {
    const { client, state, refresh } = setup({ refreshFails: true });

    const results = await Promise.allSettled([client.get('/a'), client.get('/b'), client.get('/c')]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(state.requests).toHaveLength(3);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      const reason = (result as PromiseRejectedResult).reason as ApiError;
      expect(reason).toBeInstanceOf(ApiError);
      expect(reason.code).toBe('INVALID_REFRESH_TOKEN');
    }
  });

  it('gửi lại mà vẫn 401: trả lỗi, không refresh lần hai, không lặp vô hạn', async () => {
    const { client, state, refresh } = setup({ refreshGivesBadToken: true });

    await expect(client.get('/a')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(state.requests).toHaveLength(2);
  });

  it('401 đến sau khi đã có token mới: gửi lại bằng token mới, không refresh', async () => {
    const { client, state, refresh } = setup();
    // Trong lúc request đang bay, nơi khác đã làm mới token xong.
    state.beforeRespond = () => {
      state.clientToken = 'new';
      state.beforeRespond = null;
    };

    const response = await client.get<{ url: string }>('/a');

    expect(response.data.url).toBe('/a');
    expect(refresh).not.toHaveBeenCalled();
    expect(state.requests.map((r) => r.authorization)).toEqual(['Bearer old', 'Bearer new']);
  });

  it('sau một lần refresh xong, lần hết hạn kế tiếp lại refresh được', async () => {
    const { client, state, refresh } = setup();
    await client.get('/a');
    expect(refresh).toHaveBeenCalledTimes(1);

    state.serverToken = 'newer'; // token vừa lấy lại hết hạn
    await client.get('/b');
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(state.requests[state.requests.length - 1].authorization).toBe('Bearer newer');
  });

  it('lỗi không phải 401 đi thẳng ra dưới dạng ApiError, không refresh', async () => {
    const { client, state, refresh } = setup();
    state.clientToken = 'new';

    await expect(client.get('/boom')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 500 });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('refresh() trả về từ attachAuthRefresh dùng chung một lần gọi với interceptor', async () => {
    const { client, refresh, handle } = setup();

    const [token] = await Promise.all([handle.refresh(), client.get('/a'), handle.refresh()]);

    expect(token).toBe('new');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
