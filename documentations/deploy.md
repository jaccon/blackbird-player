# BlackBird Deployment & Packaging Guide

This document outlines how to compile and package the BlackBird Media Player into distributable installer files (`.dmg`, `.pkg`, `.exe`, `.AppImage`, etc.) depending on the target OS.

BlackBird relies on `electron-builder` to manage its application generation process.

## Available Build Commands

You can trigger the desired build process by running one of the dedicated NPM scripts in the terminal:

| Build Command | Description | Output Location |
| :--- | :--- | :--- |
| `npm run build:mac` | Compiles macOS `.dmg`, `.pkg`, and `.zip` for Apple Silicon (ARM64) architecture. | `dist/mac-arm64/` |
| `npm run build:mac:intel` | Compiles macOS `.dmg` and `.zip` for older Intel (x64) architectures. | `dist/mac/` |
| `npm run build:win` | Compiles Windows installer (`.exe` Setup) using NSIS. | `dist/win-unpacked/` |
| `npm run build:linux` | Compiles Linux distributions (`.AppImage`, `.snap`, `.deb`). | `dist/linux-unpacked/` |
| `npm run build:unpack` | Builds the app without compressing it into an installer. Great to test the compiled code before locking it away. | `dist/mac-arm64/` (depends on OS) |

*Note: All commands will first execute TypeScript type checks (`typecheck`) and the base Electron Vite compilation (`electron-vite build`) before creating the installers.*

## Installer Customization (Branding)

### Custom Background and Logotypes

For macOS `.dmg` (Drag and Drop window) and `.pkg` (Installation Wizard), we configured Custom Installer Backgrounds mapping directly to the logo. 

To edit or change this installer background:
1. Ensure your original artwork is ready.
2. Convert it/place it as a PNG image in `build/background.png`.
3. Re-run `npm run build:mac` and the new artwork will automatically be pulled by `electron-builder.yml`.

If you update `logotipo.svg` in the root and want to regenerate the installer background:
```bash
qlmanage -t -s 800 -o build logotipo.svg
mv build/logotipo.svg.png build/background.png
```

### App Icon

The global Application Icon is sourced from the `build/` directory depending on target:
- `build/icon.icns` -> For macOS applications
- `build/icon.ico` -> For Windows executables
- `build/icon.png` -> For Linux and fallbacks

## Windows SmartScreen & Trust Warnings

When users download and run the `.exe` (NSIS Installer) for the first time, Windows Defender SmartScreen may flag it with **"Windows protected your PC"** or **"Unknown Publisher"**.

**Why this happens:** This is standard behavior for executable files compiled without an EV Code Signing Certificate physically purchased for thousands of dollars per year. The `.exe` is perfectly safe, but since it hasn't established "Internet Reputation" globally yet, Microsoft warns users.

**How to Install:** 
Tell your users to simply click **"More info"** on the popup, and then click the newly revealed **"Run anyway"** button. 

To mitigate visual panic, we embedded the Publisher String as `Jaccon` directly in the `electron-builder.yml` manifest, though the initial prompt will still appear until thousands of users have run the installer or a certificate gets attached.

## Security and System Permissions

When compiling for MacOS specifically, the application leverages Hardened Runtimes and the `build/entitlements.mac.plist` configuration.
This ensures the final user receives prompt confirmations (like "BlackBird would like to access your microphone", or "Desktop Folder"). 

The following accesses are enabled for distributed builds:
- Read/Write to User Desktop, Downloads, and general user-selected files.
- Removable Volumes (Pen Drives, External HDs).
- Basic Audio (Microphone) and Camera API support for embedded elements.

## Creating a GitHub Release

Once you have bumped your `package.json` version and compiled the new `/dist` installers, follow these steps to tag and publish the new release to GitHub:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: release version 1.0.X (Describe your features)"
   ```

2. **Create the Git Tag:**
   ```bash
   git tag v1.0.X
   ```

3. **Push the commit and the Tag to GitHub:**
   ```bash
   git push origin main
   git push origin v1.0.X
   ```

4. Go to the **Releases** tab on your GitHub repository page. GitHub will show the new tag. Click **"Draft a new release"**, select the `v1.0.X` tag, write your release notes, and upload the generated files from the `/dist` folder (e.g., `.setup.exe`, `.dmg`, `.pkg`).
