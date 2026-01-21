import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import puppeteer from 'puppeteer';

// --- CONFIGURATION ---
const CHUNK_LIMIT_PX = 3000;
const MAX_CHUNKS = 5;
const DEVICES = {
  'desktop': { name: 'Desktop (HiDPI)', width: 1920, height: 1080, isMobile: false, scale: 2 },
  'laptop': { name: 'Laptop (HiDPI)', width: 1366, height: 768, isMobile: false, scale: 1.5 },
  'ipad': { name: 'iPad Air', width: 820, height: 1180, isMobile: true, scale: 2 },
  'iphone14': { name: 'iPhone 14 Pro', width: 393, height: 852, isMobile: true, scale: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
  'pixel7': { name: 'Google Pixel 7', width: 412, height: 915, isMobile: true, scale: 2.6, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36' }
};

// --- WARM UP ---
async function warmUpPage(page) {
  try {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const bodyH = document.body.scrollHeight;
          const docH = document.documentElement.scrollHeight;
          const maxH = Math.max(bodyH, docH);

          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= maxH - window.innerHeight || totalHeight > 15000) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 40);
      });
    });
  } catch (e) {
    console.log("Warmup scroll failed or interrupted.", e.message);
  }
}

// --- HELPER: SMART SCREENSHOT ---
async function takeSmartScreenshots(page, url, config, isFullPage) {
  await page.setUserAgent(config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');

  // Set initial viewport
  await page.setViewport({
    width: config.width,
    height: config.height,
    isMobile: config.isMobile,
    deviceScaleFactor: config.scale
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.warn(`Timeout loading ${url}, forcing screenshot anyway.`);
  }

  await warmUpPage(page);
  await new Promise(r => setTimeout(r, 1500));

  const buffers = [];

  if (!isFullPage) {
    const buffer = await page.screenshot({ type: 'png' });
    buffers.push({ buffer, nameSuffix: '' });
  } else {
    // FIX: Better Height Detection
    const fullHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
    });

    await page.setViewport({
      width: config.width,
      height: fullHeight,
      isMobile: config.isMobile,
      deviceScaleFactor: config.scale
    });

    if (fullHeight <= CHUNK_LIMIT_PX) {
      const buffer = await page.screenshot({ type: 'png', fullPage: true });
      buffers.push({ buffer, nameSuffix: '-full' });
    }
    else {
      let offset = 0;
      let chunkIndex = 1;

      while (offset < fullHeight && chunkIndex <= MAX_CHUNKS) {
        const heightToCapture = Math.min(CHUNK_LIMIT_PX, fullHeight - offset);

        await page.evaluate((y) => window.scrollTo(0, y), offset);
        await new Promise(r => setTimeout(r, 250));

        const buffer = await page.screenshot({
          type: 'png',
          clip: {
            x: 0,
            y: offset,
            width: config.width,
            height: heightToCapture
          }
        });

        buffers.push({ buffer, nameSuffix: `-part${chunkIndex}` });
        offset += heightToCapture;
        chunkIndex++;
      }
    }
  }

  return buffers;
}

// --- EXPORT ---
export const data = new SlashCommandBuilder()
  .setName('preview')
  .setDescription('Generate a screenshot of a website')
  .addStringOption(option =>
    option.setName('url').setDescription('The URL to capture').setRequired(true))
  .addStringOption(option =>
    option.setName('device')
      .setDescription('Choose a device or select "All"')
      .setRequired(true)
      .addChoices(
        { name: '🔥 All Devices (Batch)', value: 'all' },
        { name: 'Desktop (1080p)', value: 'desktop' },
        { name: 'Laptop (13")', value: 'laptop' },
        { name: 'iPhone 14 Pro', value: 'iphone14' },
        { name: 'Google Pixel 7', value: 'pixel7' },
        { name: 'iPad Air', value: 'ipad' }
      ))
  .addBooleanOption(option =>
    option.setName('fullpage')
      .setDescription('Capture the full scrollable page? (Default: False)'));

export async function execute(interaction) {
  let url = interaction.options.getString('url');
  const deviceKey = interaction.options.getString('device');
  const isFullPage = interaction.options.getBoolean('fullpage') ?? false;

  if (!url.startsWith('http')) url = 'https://' + url;

  await interaction.deferReply();

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const attachments = [];
    let summaryText = `**Preview Report**\nURL: ${url}\nMode: ${isFullPage ? 'Full Page' : 'Viewport'}\n`;

    if (deviceKey === 'all') {
      const batchList = ['desktop', 'laptop', 'ipad', 'iphone14'];
      for (const key of batchList) {
        const config = DEVICES[key];
        const results = await takeSmartScreenshots(page, url, config, false);
        results.forEach(res => {
          const file = new AttachmentBuilder(res.buffer, { name: `${key}${res.nameSuffix}.png` });
          attachments.push(file);
        });
      }
      summaryText += `**Devices:** Batch (Viewport Only)`;
    } else {
      const config = DEVICES[deviceKey];
      const results = await takeSmartScreenshots(page, url, config, isFullPage);

      results.forEach(res => {
        const file = new AttachmentBuilder(res.buffer, { name: `${deviceKey}${res.nameSuffix}.png` });
        attachments.push(file);
      });

      summaryText += `**Device:** ${config.name} (${config.width}x${config.height})`;
      if (results.length > 1) {
        summaryText += `\n*Note: The page was too long, so it was split into ${results.length} parts.*`;
      }
    }

    await browser.close();

    await interaction.editReply({
      content: summaryText,
      files: attachments
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error(error);
    await interaction.editReply(`**Failed to capture site.**\nReason: ${error.message}`);
  }
}