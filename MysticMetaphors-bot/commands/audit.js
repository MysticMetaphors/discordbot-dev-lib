import { SlashCommandBuilder } from 'discord.js';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import https from 'https';
import fs from 'fs';
import path from 'path';

// --- HELPERS ---
function getSSLInfo(hostname) {
  return new Promise((resolve) => {
    const options = {
      host: hostname,
      port: 443,
      method: 'GET',
      rejectUnauthorized: false,
      agent: new https.Agent({ maxCachedSessions: 0 })
    };
    const req = https.request(options, (res) => {
      // Use res.socket (newer Node versions)
      const cert = res.socket.getPeerCertificate();
      if (!cert || !Object.keys(cert).length) return resolve({ valid: false, days: 0 });
      const validTo = new Date(cert.valid_to);
      const days = Math.floor((validTo - new Date()) / (1000 * 60 * 60 * 24));
      resolve({ valid: true, days });
    });
    req.on('error', () => resolve({ valid: false, error: true }));
    req.end();
  });
}

async function runFullAudit(url) {
  const startTime = Date.now();
  let chrome;

  try {
    const chromeSessionPath = path.join(process.cwd(), '.chrome_session');
    if (!fs.existsSync(chromeSessionPath)) {
      fs.mkdirSync(chromeSessionPath, { recursive: true });
    }

    // Launch Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless'],
      userDataDir: chromeSessionPath
    });

    const options = { logLevel: 'silent', output: 'json', onlyCategories: ['performance', 'seo'], port: chrome.port };
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;

    // Tech Stack & Header Detection
    const response = await fetch(url);
    const html = await response.text();
    const headers = response.headers;
    const detected = [];
    const has = (r) => r.test(html);

    // Framework Detection
    if (has(/id="__NEXT_DATA__"/) || has(/\/_next\/static/)) detected.push('Next.js');
    if (has(/data-reactroot/) || has(/react/i)) detected.push('React');
    if (has(/data-v-/) || has(/__vue__/)) detected.push('Vue.js');
    if (headers.get('set-cookie')?.includes('laravel_session')) detected.push('Laravel');
    if (has(/\/wp-content\//)) detected.push('WordPress');

    let techStack = detected.length > 0 ? [...new Set(detected)].join(', ') : 'Standard HTML/JS';
    const server = headers.get('server');
    if (server) techStack += ` | Server: ${server}`;

    await chrome.kill();

    return {
      latency: Date.now() - startTime,
      perfScore: lhr.categories.performance.score * 100,
      seoScore: lhr.categories.seo.score * 100,
      techStack,
      status: response.status,
      // Expanded Security Headers
      security: {
        hsts: headers.get('strict-transport-security'),
        csp: headers.get('content-security-policy'),
        xFrame: headers.get('x-frame-options'),
        xContent: headers.get('x-content-type-options'),
        referrer: headers.get('referrer-policy'),
        permissions: headers.get('permissions-policy')
      }
    };
  } catch (e) {
    if (chrome) await chrome.kill();
    throw e;
  }
}

// --- EXPORT ---
export const data = new SlashCommandBuilder()
  .setName('audit')
  .setDescription('Run a full audit (Lighthouse + Security + Tech)')
  .addStringOption(option =>
    option.setName('url').setDescription('The URL to audit').setRequired(true));

export async function execute(interaction) {
  let url = interaction.options.getString('url');
  if (!url.startsWith('http')) url = 'https://' + url;
  const hostname = new URL(url).hostname;

  await interaction.deferReply();

  try {
    const [data, ssl] = await Promise.all([runFullAudit(url), getSSLInfo(hostname)]);
    const authorName = interaction.client.authorName || "Bot";
    const sec = data.security; // Shorthand for readability below

    // Helper to format header values (truncate if too long, or show MISSING)
    const fmt = (val) => val ? (val.length > 20 ? 'Enabled (Complex)' : val) : 'MISSING';
    const boolFmt = (val) => val ? 'Enabled' : 'MISSING';

    const report = `
\`\`\`ini
REPORT: ${hostname.toUpperCase()}
========================================
[STATUS]  [${data.status === 200 ? 'OK' : 'WARN'}] ${data.status}
[LATENCY] ${data.latency}ms
[SCORES]  Perf: ${data.perfScore.toFixed(0)}/100 | SEO: ${data.seoScore.toFixed(0)}/100
  
[SECURITY HEADERS]
----------------------------------------
[+] SSL:        ${ssl.valid ? `Valid (${ssl.days} days)` : 'INVALID'}
[+] HSTS:       ${boolFmt(sec.hsts)}
[+] CSP:        ${boolFmt(sec.csp)}
[+] X-Frame:    ${fmt(sec.xFrame)}
[+] X-Content:  ${fmt(sec.xContent)}
[+] Referrer:   ${fmt(sec.referrer)}
[+] Perms-Pol:  ${boolFmt(sec.permissions)}
  
[TECH_STACK]
----------------------------------------
${data.techStack}
  
========================================
Bot maintained by: ${authorName}
      \`\`\`
    `;
    await interaction.editReply(report);
  } catch (error) {
    console.error(error);
    await interaction.editReply(`**Audit Failed:** ${error.message}`);
  }
}