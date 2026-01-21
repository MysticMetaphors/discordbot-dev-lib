import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import puppeteer from 'puppeteer';

// --- CONFIGURATION ---
const DEVICES = {
  'desktop': { name: 'Desktop (1080p)', width: 1920, height: 1080, isMobile: false, scale: 1 },
  'laptop': { name: 'Laptop (13")', width: 1366, height: 768, isMobile: false, scale: 1 },
  'iphone14': { name: 'iPhone 14 Pro', width: 393, height: 852, isMobile: true, scale: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
  'pixel7': { name: 'Google Pixel 7', width: 412, height: 915, isMobile: true, scale: 2.6, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36' },
  'ipad': { name: 'iPad Air', width: 820, height: 1180, isMobile: true, scale: 2 }
};

// --- HELPER ---
async function captureSite(url, deviceKey) {
  const config = DEVICES[deviceKey];
  const browser = await puppeteer.launch({
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: config.width,
      height: config.height,
      isMobile: config.isMobile,
      deviceScaleFactor: config.scale
    });

    if (config.userAgent) await page.setUserAgent(config.userAgent);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    await browser.close();
    return { buffer, config };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// --- EXPORT ---
export const data = new SlashCommandBuilder()
  .setName('preview')
  .setDescription('Generate a screenshot of a website on a specific device')
  .addStringOption(option =>
    option.setName('url').setDescription('The URL to capture').setRequired(true))
  .addStringOption(option =>
    option.setName('device')
      .setDescription('Choose a device viewport')
      .setRequired(true)
      .addChoices(
        { name: 'Desktop (1080p)', value: 'desktop' },
        { name: 'Laptop (13")', value: 'laptop' },
        { name: 'iPhone 14 Pro', value: 'iphone14' },
        { name: 'Google Pixel 7', value: 'pixel7' },
        { name: 'iPad Air', value: 'ipad' }
      ));

export async function execute(interaction) {
  let url = interaction.options.getString('url');
  const deviceKey = interaction.options.getString('device');
  if (!url.startsWith('http')) url = 'https://' + url;

  await interaction.deferReply();

  try {
    const { buffer, config } = await captureSite(url, deviceKey);
    const file = new AttachmentBuilder(buffer, { name: 'screenshot.png' });
    const authorName = interaction.client.authorName || "Bot"; // Fallback if author not set

    const report = `
      \`\`\`ini
      Device Preview: ${config.name}
      ========================================
      [URL] ${url}
      [RESOLUTION] ${config.width}x${config.height}

      ========================================
      Bot maintained by: ${authorName}
      \`\`\`
    `;
    await interaction.editReply({ content: report, files: [file] });
  } catch (error) {
    console.error(error);
    await interaction.editReply(`**Failed to load site.**\nReason: ${error.message}`);
  }
}