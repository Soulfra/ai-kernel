const { parseChatlog, generateDoc } = require('../../scripts/features/chatlog-parser/index');

describe('chatlog-parser feature', () => {
  test('extracts TODOs and bullet points', () => {
    const chat = 'Hello\nTODO: Refactor backup\n- Add tests\n* Document\nNot a todo';
    const ideas = parseChatlog(chat);
    expect(ideas).toEqual(['TODO: Refactor backup', '- Add tests', '* Document']);
  });

  test('generates markdown with frontmatter', () => {
    const ideas = ['TODO: Refactor backup', '- Add tests'];
    const doc = generateDoc(ideas, 'chat.md');
    expect(doc).toMatch(/---/);
    expect(doc).toMatch(/title:/);
    expect(doc).toMatch(/Refactor backup/);
  });
});
