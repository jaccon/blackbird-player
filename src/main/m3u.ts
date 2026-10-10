import fs from 'fs';
import crypto from 'crypto';
import { DBM3uChannel } from './database';

export async function parseM3uFile(filePath: string): Promise<DBM3uChannel[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return parseM3uContent(content);
}

export async function parseM3uUrl(url: string): Promise<DBM3uChannel[]> {
  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error('Invalid URL. It must begin with http:// or https://');
  }

  const response = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch M3U playlist (${response.status} ${response.statusText})`);
  }

  const content = await response.text();
  return parseM3uContent(content);
}

export function parseM3uContent(content: string): DBM3uChannel[] {
  // Strip BOM if present
  const cleanContent = content.replace(/^\uFEFF/, '');
  const lines = cleanContent.split(/\r?\n/);
  const channels: DBM3uChannel[] = [];
  
  let currentMeta: {
    name?: string;
    logo_url?: string;
    group_title?: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      currentMeta = {};
      
      // Match tvg-logo
      const logoMatch = line.match(/tvg-logo=["']?([^"' \t\r\n]+)["']?/i);
      if (logoMatch && logoMatch[1]) {
        currentMeta.logo_url = logoMatch[1].trim();
      }
      
      // Match group-title
      const groupMatch = line.match(/group-title=["']([^"']+)["']/i) || line.match(/group-title=([^, \t\r\n]+)/i);
      if (groupMatch && groupMatch[1]) {
        currentMeta.group_title = groupMatch[1].trim();
      }

      // Match tvg-name
      const tvgNameMatch = line.match(/tvg-name=["']([^"']+)["']/i);
      if (tvgNameMatch && tvgNameMatch[1]) {
        currentMeta.name = tvgNameMatch[1].trim();
      }

      // Extract name after comma (standard M3U format)
      const commaIdx = line.indexOf(',');
      if (commaIdx !== -1) {
        const namePart = line.substring(commaIdx + 1).trim();
        if (namePart) {
          currentMeta.name = namePart;
        }
      }
    } else if (line.startsWith('#EXTGRP:')) {
      // Group title directive
      if (currentMeta) {
        const grp = line.substring(8).trim();
        if (grp) {
          currentMeta.group_title = grp;
        }
      }
    } else if (line.startsWith('#')) {
      // Other directive or comment, ignore
      continue;
    } else {
      // Stream URL line
      const streamUrl = line;
      let channelName = currentMeta?.name;

      if (!channelName || channelName === 'Unknown Channel') {
        try {
          const parts = streamUrl.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            const decoded = decodeURIComponent(lastPart.split('?')[0]).replace(/\.[^/.]+$/, '').trim();
            if (decoded) channelName = decoded;
          }
        } catch {
          // fallback
        }
      }

      // Generate a stable MD5 hash of the URL to prevent duplicates and preserve favorites on re-import
      const id = crypto.createHash('md5').update(streamUrl).digest('hex');

      channels.push({
        id,
        name: channelName || 'Unknown Channel',
        url: streamUrl,
        group_title: currentMeta?.group_title || 'General',
        logo_url: currentMeta?.logo_url || undefined,
        is_favorite: 0
      });

      currentMeta = null;
    }
  }

  return channels;
}
