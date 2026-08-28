import { ChatSource } from './chat';

// YouTube sends no CORS headers, so chat has to come through a proxy -- see worker/index.js.
// Override with &youtubeproxy= to point at a local `wrangler dev` without rebuilding.
export const DEFAULT_PROXY = 'https://chatbuzz-yt.mattyherzig.workers.dev';

const OFFLINE_RETRY_MS = 30_000;
// A proxy error means the live state is unknown rather than offline, so recheck sooner
const ERROR_RETRY_MS = 5_000;
// YouTube suggests ~10s between polls, but that is only a hint and polling faster really
// does return fresher messages: median message age measured 4.5s at its suggested interval
// against 2.7s at 2s, worst case 10.1s against 3.2s. Momentary repeats are the whole point
// of the overlay, so take the tighter loop. Costs ~1800 proxy requests per viewer-hour.
const MAX_POLL_INTERVAL_MS = 2_000;

export interface YouTubeOptions {
  /** A @handle or a UC... channel id */
  id: string;
  proxyUrl: string;
  debugMode: boolean;
  /** Shown in the overlay while waiting; called with '' once connected */
  onStatus: (text: string) => void;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function youtubeChat({id, proxyUrl, debugMode, onStatus}: YouTubeOptions): ChatSource {
  async function request(path: string, init?: RequestInit): Promise<any> {
    try {
      return await (await fetch(proxyUrl.replace(/\/$/, '') + path, init)).json();
    } catch (error) {
      if (debugMode) console.error('YouTube proxy request failed', error);
      return null;
    }
  }

  /** Waits for the channel to be live, so OBS can be opened before the stream starts. */
  async function resolveWhenLive() {
    for (;;) {
      const data = await request(`/resolve?id=${encodeURIComponent(id)}`);
      if (data?.live) return data;
      if (data?.error && debugMode) console.error('YouTube resolve failed', data.error);

      // Every failure used to read "waiting to go live", so a mistyped channel looked
      // exactly like a channel that simply hadn't started yet
      if (data?.retry === false) {
        onStatus(`Can't find the YouTube channel "${id}" - check the name`);
      } else if (data?.error || !data) {
        onStatus(`Connecting to YouTube…`);
      } else {
        onStatus(`Waiting for ${id} to go live…`);
      }
      await delay(data && !data.error ? OFFLINE_RETRY_MS : ERROR_RETRY_MS);
    }
  }

  return async (onMessage) => {
    for (;;) {
      const {continuation, key, clientVersion} = await resolveWhenLive();
      onStatus('');

      let next: string | null = continuation;
      // The first response replays chat history -- measured at 75 messages against 1-5 for
      // later polls -- so counting it would spawn a wall of bogus repeats
      let isFirstPoll = true;

      while (next) {
        const data = await request('/poll', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({continuation: next, key, clientVersion}),
        });
        if (!data || data.error) break;

        const interval = Math.min(data.timeoutMs || 5000, MAX_POLL_INTERVAL_MS);
        const startedAt = Date.now();

        if (isFirstPoll) {
          isFirstPoll = false;
        } else {
          // A poll answers with a whole batch at once, so replay it using each message's
          // real send time. Spacing them evenly instead would invent a rhythm chat never
          // had -- five messages fired off in one second would look five seconds apart.
          let previousSentAt = 0;
          for (const {author, text, parts, sentAt} of data.messages) {
            if (previousSentAt && sentAt) {
              await delay(Math.min(Math.max(sentAt - previousSentAt, 0), interval));
            }
            previousSentAt = sentAt;
            // YouTube has no stable login name, only a changeable display name
            onMessage({username: (author || '').toLowerCase(), text, parts});
          }
        }

        next = data.continuation;
        await delay(Math.max(0, interval - (Date.now() - startedAt)));
      }
      // Stream ended or the token expired; go back to waiting for it to be live
    }
  };
}
