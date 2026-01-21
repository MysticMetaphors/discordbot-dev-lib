# Discord Site Auditor Bot

A Discord bot that performs full website audits using Google Lighthouse.SEO, Tech Stack, and Security Headers directly from Discord. It analyzes Performance and renders websites on simulated devices (iPhone, Pixel, Desktop) to test responsive design

## Features
- **Lighthouse Analysis:** specific scores for Performance & SEO.
- **Tech Stack Detection:** Identifies Frameworks (Next.js, React, Laravel) and Server types.
- **Security Audit:** Checks SSL validity, HSTS, and Clickjacking protection.
- **Headless Browser:** Uses a real Chrome instance for accurate rendering.
- **High-Res Screenshots:** Uses Puppeteer to capture actual rendering.
- **Device Simulation:** Spoofs User-Agents and Viewport sizes.
- **Presets:** Includes iPhone 14, Pixel 7, iPad Air, and Desktop.

## Prerequisites
You need these installed on the machine running the bot:
1. **Node.js** (v18 or higher)
2. **Google Chrome** (The bot needs a browser to audit sites)

## Installation

1. **Clone the repository**
  ```bash
  git clone [https://github.com/MysticMetaphors/discordbot-dev-lib.git](https://github.com/MysticMetaphors/discordbot-dev-lib.git)
  cd MysticMetaphors-bot
  ```

2. **Install Dependencies**
  ```bash
  npm install

3. **Configure Environment Create a .env file in the root folder and add your keys**
  ```bash
  DISCORD_TOKEN=your_bot_token_here
  CLIENT_ID=your_application_id_here
  ```

4. **Start the Bot**
  ```bash
  npm index.js
  ```

## Create the Bot (Discord Side)

Before running the code, you need to create an application on Discord.

1.  **Go to the Developer Portal:**
    Visit [discord.com/developers/applications](https://discord.com/developers/applications) and click **"New Application"**. Name it (e.g., "Site Auditor").

2.  **Get the Token:**
    * Click **Bot** on the left sidebar.
    * Click **Reset Token** and copy it.
    * *Paste this into your `.env` file as `DISCORD_TOKEN`.*

3.  **Get the Client ID:**
    * Click **OAuth2** on the left sidebar.
    * Copy the **Client ID**.
    * *Paste this into your `.env` file as `CLIENT_ID`.*

4.  **Invite the Bot (Crucial Step):**
    To make slash commands work, you must invite the bot with the `applications.commands` scope.
    * Go to **OAuth2** -> **URL Generator**.
    * **SCOPES:** Check `bot` AND `applications.commands`.
    * **BOT PERMISSIONS:** Check `Send Messages`, `Read Message History`, `Embed Links`, and `Attach Files`.
    * Copy the generated URL at the bottom and paste it into your browser to invite the bot to your server.

> **⚠️ Note:** If you forget to check `applications.commands`, the bot will join, but typing commands will do nothing.

## Command Documentation

### 1. Help
List all available commands and how to use them.
```bash
/help
```

### 2. Audit Websites
Performs a comprehensive technical and security audit of a website.
```bash
/audit url:<website_url> 
```

## 3. Preview Websites
Generates a high-resolution screenshot of a website as it appears on specific real-world devices.
```bash
/preview url:<your-website-url> device:<device-type>
```

## 4. Map Websites
Visualize the website structure
```bash
/map url:<your-website-url>
```

## 5. Crawl Check
Simulate search engine access to any URL and detect blocked paths
```bash
/crawl-check url:<your-website-url> path:<choosen-pathl> bot:<choosen-bot>
```




  