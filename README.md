# VocabVault

VocabVault is a vocabulary learning app with two connected parts:

- A web dashboard for looking up words, reviewing saved vocabulary, and importing or exporting data.
- A Chrome extension for selecting a word on any page and saving it directly to your vocabulary list.

The app uses a local English-Vietnamese dictionary from `dict.json`, an Express backend in `server.ts`, and a Vite + React frontend in `src/`.

## Overview

- `server.ts`: Express backend that serves the API and app
- `src/`: React dashboard UI
- `extension/`: Chrome extension
- `words.json`: saved vocabulary data
- `dict.json`: local dictionary data used for lookup

## Requirements

- Node.js 18 or later (includes npm)
- Google Chrome or another browser that supports Manifest V3 extensions

No API key is required.

## Installing Node.js and npm

If you don't have Node.js or npm installed, follow the instructions for your operating system.

### Windows

1. Go to [https://nodejs.org](https://nodejs.org) and download the **LTS** installer (`.msi`).
2. Run the installer and follow the prompts. npm is included automatically.
3. Verify the installation:

```cmd
node -v
npm -v
```

> **Troubleshooting — PowerShell execution policy error**
>
> If you see `npm.ps1 cannot be loaded because running scripts is disabled on this system`, PowerShell is blocking script execution. Fix it by running this command **once** in PowerShell as Administrator:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
>
> Then close and reopen your terminal. Alternatively, use **Command Prompt** (`cmd`) instead of PowerShell — the error does not occur there.

### macOS

Using [Homebrew](https://brew.sh) (recommended):

```bash
brew install node
```

Or download the macOS installer (`.pkg`) from [https://nodejs.org](https://nodejs.org).

Verify:

```bash
node -v
npm -v
```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y nodejs npm
```

For the latest version, use [NodeSource](https://github.com/nodesource/distributions):

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm run dev
```

The app runs at:

```text
http://localhost:3000
```

### 3. Open the dashboard

Visit:

```text
http://localhost:3000
```

## API Endpoints

The backend exposes these routes:

- `GET /api/lookup/:word`: look up a word in the local dictionary
- `GET /api/suggest?q=...`: return autocomplete suggestions
- `GET /api/words`: return saved vocabulary
- `POST /api/words`: save a word
- `DELETE /api/words/:id`: delete a saved word

## Chrome Extension Setup

The extension source is in `extension/`.

### Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension` folder

### Extension requirements

- The app server must be running at `http://localhost:3000`
- `dict.json` must be present
- `words.json` must be writable

### How to use the extension

1. Open any webpage.
2. Highlight a single English word.
3. A popup will show the Vietnamese definition.
4. Click `Save to VocabVault`.
5. Open the extension popup or dashboard to review saved words.

## Data Storage

The app currently stores data in two places:

- `words.json`: the saved vocabulary list
- `localStorage`: the dashboard goal value under `vocabvault.goal`

The Chrome extension does not maintain a separate word list in `chrome.storage`. It sends requests directly to the backend, which writes to `words.json`.

## Reset Saved Vocabulary

There are three practical reset options depending on what you want to clear.

### Option 1: Delete individual words

Use this when you only want to remove a few entries.

1. Open the dashboard at `http://localhost:3000`
2. In the history list, click the trash icon next to the word you want to remove

### Option 2: Reset the full saved word list

Use this when you want to clear all saved vocabulary but keep the rest of the app unchanged.

Replace the contents of `words.json` with:

```json
[]
```

Then restart the server or refresh the dashboard.

### Option 3: Reset saved words and the dashboard goal

Use this when you want the app to behave like a fresh start.

1. Replace `words.json` with:

```json
[]
```

2. Open the dashboard in the browser
3. Open DevTools and go to the Console tab
4. Run:

```js
localStorage.removeItem("vocabvault.goal")
```

5. Refresh the page

After that, the goal resets to the default value of `1000`.

## Backup and Restore

### Export

The dashboard can export saved vocabulary as:

```text
vocabvault_export.json
```

### Import

The dashboard can import a previously exported JSON file.

During import:

- imported words are merged with the current list
- duplicate words keep the most recently saved version

## Common Issues

### The extension cannot connect to the server

Check that:

- `npm run dev` is running
- the server is available at `http://localhost:3000`
- the extension has been reloaded after changes

### Word lookup returns no result

Check that:

- `dict.json` exists
- the server logs do not show a missing dictionary warning

### The dashboard opens but saved words do not appear

Check that:

- `words.json` contains valid JSON
- the file is writable
- you are running the correct local project instance

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Suggested Development Flow

1. Run `npm install`
2. Run `npm run dev`
3. Open `http://localhost:3000`
4. Load the `extension/` folder in Chrome
5. Highlight words on webpages to test the save flow
6. Verify saved data in the dashboard and `words.json`
