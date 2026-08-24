import { ChatSource, MessagePart } from './chat';

// YouTube serves no CORS headers on any chat endpoint, so the browser cannot read live
// chat directly -- see worker/index.js. Override with &ytproxy= to test a local
// `wrangler dev` without rebuilding the bundle.
const DEFAULT_PROXY = 'https://chatbuzz-yt.mattyherzig.workers.dev';

/** How long to wait before re-checking a channel that isn't live yet. */
const OFFLINE_RETRY_MS = 30_000;

export interface YouTubeOptions {
  /** A @handle or a UC... channel id */
  id: string;
  proxyUrl: string;
  debugMode: boolean;
  /** Shown in the overlay while waiting to connect; called with '' once connected */
  onStatus: (text: string) => void;
}

interface Session {
  continuation: string;
  key: string;
  clientVersion: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export { DEFAULT_PROXY };

export function youtubeChat(options: YouTubeOptions): ChatSource {
  const {id, proxyUrl, debugMode, onStatus} = options;

  async function request(path: string, init?: RequestInit): Promise<any> {
    try {
      const response = await fetch(proxyUrl.replace(/\/$/, '') + path, init);
      return await response.json();
    } catch (error) {
      if (debugMode) console.error('YouTube proxy request failed', error);
      return null;
    }
  }

  /** Polls until the channel is actually live, so OBS can be opened before going live. */
  async function resolveWhenLive(): Promise<Session> {
    for (;;) {
      const data = await request(`/resolve?id=${encodeURIComponent(id)}`);
      if (data?.live) return data as Session;
      if (data?.error) {
        onStatus(`YouTube: ${data.error}`);
        if (debugMode) console.error('YouTube resolve failed', data.error);
      } else {
        onStatus(`Waiting for ${id} to go live…`);
      }
      await delay(OFFLINE_RETRY_MS);
    }
  }

  return async (onMessage) => {
    for (;;) {
      const session = await resolveWhenLive();
      onStatus('');

      let continuation: string | null = session.continuation;
      // The first response replays recent chat history -- measured at 75 messages
      // against 1-5 for later polls. Counting it would spawn a wall of bogus repeats.
      let isFirstPoll = true;

      while (continuation) {
        const data = await request('/poll', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            continuation,
            key: session.key,
            clientVersion: session.clientVersion,
          }),
        });
        if (!data || data.error) break;

        if (isFirstPoll) {
          isFirstPoll = false;
        } else {
          for (const message of data.messages as Array<{author: string; text: string; parts: MessagePart[]}>) {
            onMessage({
              // YouTube has no stable login name, only a changeable display name
              username: (message.author || '').toLowerCase(),
              text: message.text,
              parts: message.parts,
            });
          }
        }

        continuation = data.continuation;
        await delay(data.timeoutMs || 5000);
      }
      // The stream ended or the token expired; go back to waiting for it to be live
    }
  };
}
