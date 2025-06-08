const { randomUUID } = require('crypto');

/**
 * Parse a ChatGPT export (txt or md) into message objects.
 * Lines starting with a role like `User:` or `Assistant:` denote new messages.
 * Timestamps may optionally appear in brackets before the role.
 * @param {string} text - chat log text contents
 * @returns {Array<{role:string, content:string, timestamp:string|null}>}
 */
function parseChatLog(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  let current = null;

  const roleRegex = /^(?:\[(?<ts>[^\]]+)\]\s*)?(?<role>User|Assistant|System|You|Bot):?\s*(?<rest>.*)/i;

  const pushCurrent = () => {
    if (current) {
      current.content = current.content.trim();
      messages.push(current);
      current = null;
    }
  };

  for (const line of lines) {
    const match = line.match(roleRegex);
    if (match) {
      pushCurrent();
      current = {
        role: match.groups.role.toLowerCase(),
        content: match.groups.rest.trim(),
        timestamp: match.groups.ts || null
      };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
  }
  pushCurrent();
  return messages;
}

/**
 * Convert parsed messages to concept objects usable by SemanticEngine.
 * @param {Array} messages - array from parseChatLog
 * @returns {Array<Object>} concepts
 */
function messagesToConcepts(messages) {
  return messages.map(m => ({
    id: randomUUID(),
    type: 'chat_message',
    content: m.content,
    metadata: { role: m.role, timestamp: m.timestamp }
  }));
}

module.exports = { parseChatLog, messagesToConcepts };
