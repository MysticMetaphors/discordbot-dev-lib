import { SlashCommandBuilder } from 'discord.js';
import robotsParser from 'robots-parser';

// --- CONFIGURATION ---
const BOTS = {
  'google': {
    name: 'Googlebot',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  },
  'bing': {
    name: 'Bingbot',
    ua: 'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)'
  },
  'gpt': {
    name: 'GPTBot (OpenAI)',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot'
  },
  'facebook': {
    name: 'FacebookBot',
    ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
  }
};

// --- CHECK ROBOTS.TXT ---
async function checkRobotsTxt(baseUrl, fullUrl, userAgent) {
  const robotsUrl = new URL('/robots.txt', baseUrl).href;

  try {
    const response = await fetch(robotsUrl);
    if (response.status !== 200) {
      return { allowed: true, status: 'Missing/Error', rule: 'None (Default Allow)' };
    }

    const txt = await response.text();
    const robot = robotsParser(robotsUrl, txt);

    const isAllowed = robot.isAllowed(fullUrl, userAgent);
    const line = robot.getMatchingLineNumber(fullUrl, userAgent);

    return {
      allowed: isAllowed,
      status: 'Found',
      rule: line ? `Line ${line}` : 'Implicit'
    };
  } catch (error) {
    return { allowed: true, status: 'Unreachable', rule: 'None (Default Allow)' };
  }
}

// --- CHECK SERVER RESPONSE ---
async function checkServerAccess(url, userAgent) {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': userAgent },
      redirect: 'follow'
    });

    return {
      code: response.status,
      ok: response.ok,
      latency: Date.now() - startTime
    };
  } catch (error) {
    return { code: 'ERR', ok: false, latency: 0, error: error.message };
  }
}

// --- EXPORT ---
export const data = new SlashCommandBuilder()
  .setName('crawl-check')
  .setDescription('Simulate a search engine bot checking a specific path')
  .addStringOption(option =>
    option.setName('url').setDescription('The base URL').setRequired(true))
  .addStringOption(option =>
    option.setName('path').setDescription('The path to check').setRequired(true))
  .addStringOption(option =>
    option.setName('bot').setDescription('Which bot to simulate?')
      .addChoices(
        { name: 'Googlebot', value: 'google' },
        { name: 'Bingbot', value: 'bing' },
        { name: 'GPTBot (ChatGPT)', value: 'gpt' },
        { name: 'FacebookBot', value: 'facebook' }
      ));

export async function execute(interaction) {
  let baseUrlInput = interaction.options.getString('url');
  let pathInput = interaction.options.getString('path');
  const botKey = interaction.options.getString('bot') || 'google';

  if (!baseUrlInput.startsWith('http')) baseUrlInput = 'https://' + baseUrlInput;
  if (!pathInput.startsWith('/')) pathInput = '/' + pathInput;

  const botConfig = BOTS[botKey];
  const fullUrl = new URL(pathInput, baseUrlInput).href;
  const hostname = new URL(baseUrlInput).hostname;

  await interaction.deferReply();

  try {
    const [robotsData, serverData] = await Promise.all([
      checkRobotsTxt(baseUrlInput, fullUrl, botConfig.name),
      checkServerAccess(fullUrl, botConfig.ua)
    ]);

    let statusText = 'ACCESSIBLE';
    if (!robotsData.allowed) {
      statusText = 'BLOCKED (ROBOTS.TXT)';
    } else if (serverData.code === 403 || serverData.code === 401) {
      statusText = 'BLOCKED (SERVER 403)';
    } else if (serverData.code === 404) {
      statusText = 'NOT FOUND (404)';
    }

    const authorName = interaction.client.authorName || "Bot";

    const report = `
\`\`\`ini
CRAWL CHECK: ${botConfig.name.toUpperCase()}
========================================
[TARGET]  ${pathInput} on ${hostname}
[VERDICT] ${statusText}

[ROBOTS.TXT]
----------------------------------------
[+] Allowed:   ${robotsData.allowed ? 'Yes' : 'NO'}
[+] Rule:      ${robotsData.rule}

[SERVER_RESPONSE]
----------------------------------------
[+] Status:    ${serverData.code}
[+] Latency:   ${serverData.latency}ms

========================================
Bot maintained by: ${authorName}
\`\`\`
    `;

    await interaction.editReply(report);

  } catch (error) {
    console.error(error);
    await interaction.editReply(`**Check Failed:** ${error.message}`);
  }
}