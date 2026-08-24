// Common shape both chat platforms normalise to, so main.ts doesn't care which is in use.

export type MessagePart =
  | {type: 'text'; text: string}
  | {type: 'emote'; url: string; code: string};

export interface ChatMessage {
  /** Lower-cased where the platform has a stable login; used by the `ignore` parameter */
  username: string;
  /** Plain text of the message: the repeat-detection key, and what gets spoken */
  text: string;
  /** How to render the message; emotes already carry their image URL */
  parts: MessagePart[];
}

/** Connects to a platform and calls onMessage for each new chat message. */
export type ChatSource = (onMessage: (message: ChatMessage) => void) => Promise<void>;
