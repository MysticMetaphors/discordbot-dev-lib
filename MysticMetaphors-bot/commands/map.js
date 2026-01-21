import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import * as cheerio from 'cheerio';

// --- CONFIGURATION ---
const MAX_DEPTH = 3;
const MAX_LINES = 30; // Limit for the visual message
const IGNORED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.ico', '.svg', '.pdf', '.json', '.xml'];

// --- HELPER: CRAWLER ---
async function crawlSite(startUrl) {
    let response;
    try {
        response = await fetch(startUrl, {
            headers: { 'User-Agent': 'DiscordBot-WebMapper/1.0' }
        });
    } catch (e) {
        throw new Error(`Could not connect to ${startUrl}.`);
    }

    if (response.status !== 200) throw new Error(`Status Code: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrlObj = new URL(startUrl);
    const paths = new Set();

    $('a').each((index, element) => {
        let href = $(element).attr('href');
        if (!href) return;

        href = href.split('#')[0].split('?')[0];
        if (href === '/' || href === '') return;

        let absoluteUrl;
        try {
            absoluteUrl = new URL(href, startUrl).href;
        } catch { return; }

        if (IGNORED_EXTENSIONS.some(ext => absoluteUrl.toLowerCase().endsWith(ext))) return;

        if (absoluteUrl.startsWith(baseUrlObj.origin)) {
            let relativePath = absoluteUrl.replace(baseUrlObj.origin, '');
            if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
            if (relativePath.endsWith('/')) relativePath = relativePath.slice(0, -1);
            
            if (relativePath.length > 0) paths.add(relativePath);
        }
    });

    return { paths: Array.from(paths).sort() };
}

// --- HELPER: TREE BUILDER ---
function buildTreeString(paths, rootLabel, limitLines = true) {
    const tree = {};
    paths.forEach(path => {
        const parts = path.split('/');
        let currentLevel = tree;
        parts.forEach((part, index) => {
            if (index >= MAX_DEPTH) return; 
            if (!currentLevel[part]) currentLevel[part] = {};
            currentLevel = currentLevel[part];
        });
    });

    // Indentation configuration
    const baseIndent = '         '; 
    let output = `${baseIndent}${rootLabel}\n`;
    let linesCount = 0;

    function renderNode(node, prefix = '') {
        const keys = Object.keys(node);
        keys.forEach((key, index) => {
            // If limitLines is true, stop after MAX_LINES
            if (limitLines && linesCount >= MAX_LINES) return;

            const isLast = index === keys.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const childPrefix = isLast ? '    ' : '│   ';

            output += `${baseIndent}${prefix}${connector}${key}\n`;
            linesCount++;
            renderNode(node[key], prefix + childPrefix);
        });
    }

    renderNode(tree);
    
    // Add truncation warning only if we are limiting lines
    if (limitLines && linesCount >= MAX_LINES) {
        output += `${baseIndent}... (truncated)\n`;
        output += `${baseIndent}(See attached file for full map)`;
    }
    
    return output;
}

// --- EXPORT ---
export const data = new SlashCommandBuilder()
    .setName('map')
    .setDescription('Visualize the website structure')
    .addStringOption(option =>
        option.setName('url').setDescription('The URL to map').setRequired(true));

export async function execute(interaction) {
    let url = interaction.options.getString('url');
    if (!url.startsWith('http')) url = 'https://' + url;
    
    await interaction.deferReply();

    try {
        const mapData = await crawlSite(url);
        const hostname = new URL(url).hostname;
        const authorName = interaction.client.authorName || "Bot";
        
        const treeViewShort = buildTreeString(mapData.paths, hostname, true);
        const treeViewFull = buildTreeString(mapData.paths, hostname, false);
        
        const attachment = new AttachmentBuilder(Buffer.from(treeViewFull, 'utf-8'), { 
            name: `${hostname}-map.txt` 
        });

        const report = `
\`\`\`text
Mapped: ${hostname}
========================================

${treeViewShort}
========================================
Bot maintained by: ${authorName}
\`\`\`
        `;

        await interaction.editReply({ 
            content: report, 
            files: [attachment] // Send the file too
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply(`**Mapping Failed:** ${error.message}`);
    }
}