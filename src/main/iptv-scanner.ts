import { BrowserWindow } from 'electron';
import { dbOps, DBM3uChannel } from './database';

export interface ScanProgress {
  current: number;
  total: number;
  validCount: number;
  removedCount: number;
  currentChannelName: string;
  status: 'checking' | 'ok' | 'removed';
  isFinished: boolean;
  wasCancelled: boolean;
}

let isScanRunning = false;
let shouldCancelScan = false;

/**
 * Tests an IPTV stream URL by requesting headers or a small byte slice.
 * Returns true if the channel responds with HTTP 200/206/301/302, false if offline/error.
 */
export async function testIptvChannelUrl(url: string, timeoutMs: number = 4500): Promise<boolean> {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Range': 'bytes=0-1024'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timer);

    // If server responded with 416 (Range Not Satisfiable), retry quick GET without Range
    if (response.status === 416) {
      const retryController = new AbortController();
      const retryTimer = setTimeout(() => retryController.abort(), 3000);
      try {
        const retryRes = await fetch(cleanUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          signal: retryController.signal,
          redirect: 'follow'
        });
        clearTimeout(retryTimer);
        if (retryRes.ok || retryRes.status === 206 || retryRes.status === 301 || retryRes.status === 302) {
          if (retryRes.body) {
            try {
              const reader = retryRes.body.getReader();
              await reader.cancel();
            } catch {}
          }
          return true;
        }
        return false;
      } catch {
        clearTimeout(retryTimer);
        return false;
      }
    }

    // Success response codes for video streams
    if (response.ok || response.status === 206 || response.status === 301 || response.status === 302) {
      if (response.body) {
        try {
          const reader = response.body.getReader();
          await reader.cancel();
        } catch {}
      }
      return true;
    }

    return false;
  } catch (_err) {
    clearTimeout(timer);
    return false;
  }
}

/**
 * Scans all IPTV channels currently stored in the database.
 * Channels that fail connectivity tests are automatically removed from DB.
 * Progress is reported to the renderer window in real-time.
 */
export async function startIptvScan(window: BrowserWindow): Promise<{ total: number; validCount: number; removedCount: number; cancelled: boolean }> {
  if (isScanRunning) {
    throw new Error('An IPTV scan is already in progress.');
  }

  isScanRunning = true;
  shouldCancelScan = false;

  const channels: DBM3uChannel[] = dbOps.getM3UChannels();
  const total = channels.length;
  let validCount = 0;
  let removedCount = 0;
  let current = 0;

  const emitProgress = (progress: ScanProgress) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('iptv-scan:progress', progress);
    }
  };

  if (total === 0) {
    isScanRunning = false;
    emitProgress({
      current: 0,
      total: 0,
      validCount: 0,
      removedCount: 0,
      currentChannelName: '',
      status: 'ok',
      isFinished: true,
      wasCancelled: false
    });
    return { total: 0, validCount: 0, removedCount: 0, cancelled: false };
  }

  // Use controlled concurrency (e.g. 6 parallel checks) to test channels quickly
  const CONCURRENCY = 6;
  let channelIndex = 0;

  async function worker() {
    while (channelIndex < channels.length && !shouldCancelScan) {
      const idx = channelIndex++;
      const ch = channels[idx];
      if (!ch) break;

      emitProgress({
        current,
        total,
        validCount,
        removedCount,
        currentChannelName: ch.name,
        status: 'checking',
        isFinished: false,
        wasCancelled: false
      });

      const isWorking = await testIptvChannelUrl(ch.url);

      if (shouldCancelScan) break;

      current++;
      if (isWorking) {
        validCount++;
        emitProgress({
          current,
          total,
          validCount,
          removedCount,
          currentChannelName: ch.name,
          status: 'ok',
          isFinished: false,
          wasCancelled: false
        });
      } else {
        // Channel is dead/offline -> automatically remove from database
        dbOps.deleteM3UChannel(ch.id);
        removedCount++;
        emitProgress({
          current,
          total,
          validCount,
          removedCount,
          currentChannelName: ch.name,
          status: 'removed',
          isFinished: false,
          wasCancelled: false
        });
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
  await Promise.all(workers);

  const wasCancelled = shouldCancelScan;
  isScanRunning = false;
  shouldCancelScan = false;

  emitProgress({
    current,
    total,
    validCount,
    removedCount,
    currentChannelName: '',
    status: 'ok',
    isFinished: true,
    wasCancelled
  });

  return { total, validCount, removedCount, cancelled: wasCancelled };
}

export function cancelIptvScan(): boolean {
  if (!isScanRunning) return false;
  shouldCancelScan = true;
  return true;
}

export function isIptvScanInProgress(): boolean {
  return isScanRunning;
}
