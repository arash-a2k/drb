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
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    this.maxTokens = options.maxTokens ?? (process.env.ANTHROPIC_MAX_TOKENS ? parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10) : 16384);
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
        stream: true,
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

    if (!response.body) {
      throw new Error('Anthropic API returned an empty response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let stopReason: string | undefined;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') continue;
        try {
          const event = JSON.parse(dataStr);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            accumulatedText += event.delta.text;
          } else if (event.type === 'message_delta') {
            if (event.delta?.stop_reason) {
              stopReason = event.delta.stop_reason;
            }
          }
        } catch {
          // ignore unparseable SSE chunk
        }
      }
    }

    if (stopReason === 'max_tokens') {
      throw new Error(`Anthropic completion reached max_tokens (${this.maxTokens}) limit and was truncated`);
    }

    if (!accumulatedText.trim()) {
      throw new Error('Anthropic API returned an empty or invalid text response');
    }

    return accumulatedText;
  }
}
