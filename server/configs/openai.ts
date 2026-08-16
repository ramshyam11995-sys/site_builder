import OpenAI from 'openai';

const Client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.AI_API_KEY,
});

export default Client;