const { parseChatlog, generateDoc } = require('../index');

describe('chatlog-parser', () => {
  it('should extract TODOs and bullets from chatlog', () => {
    const chat = 'Hello\nTODO: Refactor backup\n- Add tests\n* Document\nNot a todo';
    const ideas = parseChatlog(chat);
    expect(ideas).toEqual(['TODO: Refactor backup', '- Add tests', '* Document']);
  });

  it('should generate a doc with YAML frontmatter', () => {
    const ideas = ['TODO: Refactor backup', '- Add tests'];
    const doc = generateDoc(ideas, 'chat.md');
    expect(doc).toMatch(/---/);
    expect(doc).toMatch(/title:/);
    expect(doc).toMatch(/- Refactor backup/);
    expect(doc).toMatch(/- Add tests/);
  });
}); 