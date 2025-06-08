const { EmbeddingService } = require('../../scripts/core/embedding-service');

jest.mock('openai', () => {
  const createEmbedding = jest.fn().mockResolvedValue({
    data: { data: [{ embedding: [0.1, 0.2, 0.3] }] }
  });
  return {
    Configuration: jest.fn().mockImplementation(() => ({})),
    OpenAIApi: jest.fn().mockImplementation(() => ({ createEmbedding }))
  };
});

describe('EmbeddingService', () => {
  it('generates an embedding using the OpenAI client', async () => {
    const service = new EmbeddingService({ apiKey: 'test', model: 'test-model' });
    const concept = { id: 'c1', type: 'note', content: 'hello', metadata: {} };
    const embedding = await service.generateEmbedding(concept);
    expect(embedding).toEqual([0.1, 0.2, 0.3]);
  });
});
