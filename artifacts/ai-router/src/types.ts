export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | any[];
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  [key: string]: any;
};

export type StreamChunk = {
  delta: { content?: string; role?: string; tool_calls?: any[] };
  finish_reason: string | null;
  id: string;
};

export type Provider = "openrouter" | "openai" | "anthropic";

export type ModelRoute = {
  provider: Provider;
  model: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
};
