# Runbook: Local Development

## Prerequisites
- Node.js Version Manager (`nvm`) installed.
- Recommended Node Version: v22.x

## Setup
1. Use the correct Node version: `nvm use 22`
2. Install dependencies: `npm install`
3. (If issues with sqlite arise): Ensure native dependencies are rebuilt: `npm rebuild`

## Running Locally
- Run local dev server: `npm run dev`

## Building For Production
- **Mac Apple Silicon**: `npm run build:mac`
- **Mac Intel (Cross-compilation from Silicon)**: `npm run build:mac:intel`
- **Windows**: `npm run build:win`
- **Linux**: `npm run build:linux`

## Common Issues
### Error: "The paths[0] argument must be of type string"
**Cause:** Attempting to build native dependencies using Node 18 (which lacks `import.meta.dirname` used by electron-rebuilder).
**Solution:** Ensure you switch to Node 22 (`nvm use 22`) before running the build command.
