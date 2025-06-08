const { parseChatLog, messagesToConcepts } = require('../../scripts/features/chatlog-utils');

describe('chatlog-utils', () => {
  test('parses simple chat log', () => {
    const text = 'User: hi\nAssistant: hello';
    const msgs = parseChatLog(text);
    expect(msgs).toEqual([
      { role: 'user', content: 'hi', timestamp: null },
      { role: 'assistant', content: 'hello', timestamp: null }
    ]);
  });

  test('maps messages to concepts', () => {
    const msgs = [{ role: 'user', content: 'test', timestamp: 'now' }];
    const concepts = messagesToConcepts(msgs);
    expect(concepts[0]).toHaveProperty('id');
    expect(concepts[0].content).toBe('test');
    expect(concepts[0].metadata.role).toBe('user');
    expect(concepts[0].metadata.timestamp).toBe('now');
  });
});
