import type { AiCompletionRequest, AiModelClient } from './orchestrator.ts';

export type AnthropicClientOptions = {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  apiBaseUrl?: string;
};

export class AnthropicModelClient implements AiModelClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly apiBaseUrl: string;

  constructor(options: AnthropicClientOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required to initialize AnthropicModelClient');
    }
    this.apiKey = apiKey;
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219';
    this.maxTokens = options.maxTokens ?? 4096;
    this.temperature = options.temperature ?? 0.2;
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.anthropic.com/v1/messages';
  }

  async completeJson(request: AiCompletionRequest): Promise<string> {
    const content = [
      request.prompt,
      '',
      'Task Input Data (JSON):',
      '```json',
      JSON.stringify(request.input, null, 2),
      '```',
      '',
      'Return ONLY the valid JSON object adhering to the schema above. Do not include any explanation, conversational text, or wrapper commentary.',
    ].join('\n');

    const response = await fetch(this.apiBaseUrl, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error?.message || errorText;
      } catch {
        // use raw text
      }
      throw new Error(`Anthropic API error (${response.status}): ${errorDetail}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content?.find((block) => block.type === 'text');
    if (!textBlock || !textBlock.text) {
      throw new Error('Anthropic API returned an empty or invalid text response');
    }

    return textBlock.text;
  }
}
