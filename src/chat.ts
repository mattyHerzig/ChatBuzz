// What both platforms normalise to, so main.ts doesn't care which is in use.

export type MessagePart =
  | {type: 'text'; text: string}
  | {type: 'emote'; url: string; code: string};

export interface ChatMessage {
  /** Lower-cased; matched against the `ignore` parameter */
  username: string;
  /** Platform account id where available: stable when a display name is not */
  userId?: string;
  /** The repeat-detection key, and what gets spoken */
  text: string;
  /** Emotes already carry their image URL */
  parts: MessagePart[];
}

export type ChatSource = (onMessage: (message: ChatMessage) => void) => Promise<void>;
