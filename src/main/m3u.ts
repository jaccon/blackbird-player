import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DBM3uChannel } from './database';

export async function parseM3uFile(filePath: string): Promise<DBM3uChannel[]> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return parseM3uContent(content);
}

export async function parseM3uUrl(url: string): Promise<DBM3uChannel[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch M3U: ${response.statusText}`);
  }
  const content = await response.text();
  return parseM3uContent(content);
}

function parseM3uContent(content: string): DBM3uChannel[] {
  const lines = content.split(/\r?\n/);
  const channels: DBM3uChannel[] = [];
  
  let currentChannel: Partial<DBM3uChannel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      currentChannel = { id: uuidv4(), is_favorite: 0 };
      
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch && logoMatch[1]) currentChannel.logo_url = logoMatch[1];
      
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch && groupMatch[1]) currentChannel.group_title = groupMatch[1];
      
      const nameMatch = line.substring(line.lastIndexOf(',') + 1).trim();
      currentChannel.name = nameMatch || 'Unknown Channel';
      
    } else if (!line.startsWith('#')) {
      if (!currentChannel) {
        currentChannel = { id: uuidv4(), name: 'Unknown Channel', is_favorite: 0 };
      }
      currentChannel.url = line;
      
      // If the name is Unknown Channel, try to infer it from the URL
      if (currentChannel.name === 'Unknown Channel') {
        const parts = line.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) currentChannel.name = lastPart.split('?')[0];
      }
      
      channels.push(currentChannel as DBM3uChannel);
      currentChannel = null;
    }
  }

  return channels;
}
