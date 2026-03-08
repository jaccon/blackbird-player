# BlackBird Theme Development Guide

The BlackBird player uses a flexible, JSON-based theme system that allows you to completely customize the look and feel of the application using standard CSS variables.

## How Themes Work
Themes are simple `.json` files that define a name and a set of variables mapped directly to the root CSS of the application. The system hot-reloads these variables in real-time.

## Structure of a Theme JSON
A valid theme file must have the following structure:
```json
{
  "name": "Your Theme Name",
  "variables": {
    "--bg-dark": "#050510",
    "--bg-card": "#0d0d1e",
    "--text-main": "#ffffff"
  }
}
```

## Available Variables
Below is the list of variables you can customize and where they are applied in the UI:

| Variable | Description |
| :--- | :--- |
| `--bg-dark` | The primary background color. Usually the darkest color. (e.g. sidebars, main background). |
| `--bg-card` | Slightly lighter background used for overlays, lists, and elevated content. |
| `--sidebar-bg`| Background color specifically for the sidebar. |
| `--text-main` | The primary text color used for titles, tracks, and active items. |
| `--text-muted` | Secondary text color used for inactive icons, descriptions, and empty states. |
| `--accent` | The main brand/highlight color used for buttons, active states, and hover effects. |
| `--accent-glow` | A semi-transparent variant of the `--accent` used for glows, borders (e.g. `rgba(255, 0, 85, 0.4)`). |
| `--border` | The color of subtle diving lines, inputs, and borders. |
| `--glass` | A highly transparent color (usually white or accent with 0.05 opacity) used for glassmorphism hover effects. |
| `--radius-lg` | Border radius for large elements like Modals or Floating Players. |
| `--radius-md` | Border radius for buttons and list items. |
| `--font-family` | The primary font stack for the theme. (e.g. `'Rajdhani', sans-serif`). |

## Examples

### 1. CyberPunk (High Contrast & Neon)
```json
{
  "name": "Cyberpunk 2077",
  "variables": {
    "--bg-dark": "#050510",
    "--bg-card": "#0d0d1e",
    "sidebar-bg": "#010108",
    "--text-main": "#ff0055",
    "--text-muted": "#ff0055",
    "--accent": "#ff0055",
    "--accent-glow": "rgba(255, 0, 85, 0.6)",
    "--border": "#ff0055",
    "--glass": "rgba(255, 0, 85, 0.15)",
    "--radius-lg": "0px",
    "--radius-md": "0px",
    "--font-family": "'Rajdhani', sans-serif"
  }
}
```

### 2. Dracula (Smooth Dark Pastels)
```json
{
  "name": "Dracula",
  "variables": {
    "--bg-dark": "#282a36",
    "--bg-card": "#44475a",
    "--sidebar-bg": "#282a36",
    "--text-main": "#f8f8f2",
    "--text-muted": "#6272a4",
    "--accent": "#bd93f9",
    "--accent-glow": "rgba(189, 147, 249, 0.4)",
    "--border": "#44475a",
    "--glass": "rgba(248, 248, 242, 0.05)",
    "--radius-lg": "16px",
    "--radius-md": "8px",
    "--font-family": "system-ui, sans-serif"
  }
}
```

### 3. Minimal Light
While BlackBird is designed around dark mode, light themes are possible if properly balanced.
```json
{
  "name": "Clean Light",
  "variables": {
    "--bg-dark": "#f4f4f5",
    "--bg-card": "#ffffff",
    "--sidebar-bg": "#fcfcfc",
    "--text-main": "#18181b",
    "--text-muted": "#71717a",
    "--accent": "#000000",
    "--accent-glow": "rgba(0, 0, 0, 0.1)",
    "--border": "#e4e4e7",
    "--glass": "rgba(0, 0, 0, 0.05)",
    "--radius-lg": "24px",
    "--radius-md": "12px",
    "--font-family": "'Inter', -apple-system, sans-serif"
  }
}
```

## How to Import
Once your JSON file is ready, open BlackBird and click the **Import Theme (Download Icon)** in the bottom left section of the sidebar, right below the Add Folder button. Select your JSON file and it will be instantly added to your collection!
