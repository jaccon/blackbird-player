const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join('/Users/jaccon/Library/Application Support/BlackBird', 'database.sqlite');
const db = new Database(dbPath);
const track = db.prepare('SELECT cover FROM tracks WHERE uuid = ?').get('40c18575-70b9-45a8-bff4-2f913b0060ad');
console.log(track);

if (track && track.cover) {
  if (track.cover.startsWith('http') || track.cover.startsWith('data:')) {
    console.log('Cover is external or data url:', track.cover.substring(0, 50));
  } else {
    const coversPath = path.join('/Users/jaccon/Library/Application Support/BlackBird', 'covers', path.basename(track.cover));
    console.log('Cover path expected:', coversPath);
    const fs = require('fs');
    console.log('Exists?', fs.existsSync(coversPath));
  }
}
