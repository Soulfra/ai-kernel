jest.mock('openai', () => {
  return {
    Configuration: jest.fn().mockImplementation(() => ({})),
    OpenAIApi: jest.fn().mockImplementation(() => ({
      createChatCompletion: jest.fn().mockResolvedValue({
        data: {
          choices: [{ message: { content: 'hi' } }],
          usage: { total_tokens: 3 }
        }
      })
    }))
  };
});

jest.mock('child_process', () => ({
  spawnSync: jest.fn().mockReturnValue({ stdout: 'local', error: null })
}));

const fs = require('fs');
const path = require('path');
const { ProviderRouter } = require('../../scripts/core/provider-router');

describe('ProviderRouter', () => {
const usagePath = path.resolve(__dirname, '../../../usage.json');

  beforeEach(() => {
    if (fs.existsSync(usagePath)) fs.unlinkSync(usagePath);
  });

  test('routes to openai and logs usage', async () => {
    process.env.OPENAI_API_KEY = 'key';
    const router = new ProviderRouter();
    const text = await router.route('testAgent', 'hello', { provider: 'openai' });
    expect(text).toBe('hi');
    const logs = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
    expect(logs[0].provider).toBe('openai');
    expect(logs[0].tokens).toBe(3);
  });

  test('routes to local provider', async () => {
    const router = new ProviderRouter();
    const text = await router.route('localAgent', 'ping', { provider: 'local' });
    expect(text).toBe('local');
  });
});
