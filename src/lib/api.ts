export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}
