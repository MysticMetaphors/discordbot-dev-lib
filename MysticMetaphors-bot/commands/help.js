import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List all available commands and how to use them');

export async function execute(interaction) {
  const authorName = interaction.client.authorName || "Bot";

  const report = `
\`\`\`ini
MANUAL: HELP
========================================
[DESCRIPTION]
Here are the available commands to help you test and preview websites.

[COMMANDS]
----------------------------------------
[/audit]
> Usage:   /audit url:<link>
> Info:    Runs a full technical audit including Lighthouse scores, 
           Security headers (SSL, HSTS), and Tech Stack detection.

[/preview]
> Usage:   /preview url:<link> device:<type>
> Info:    Takes a high-res screenshot on specific devices (iPhone 14, 
           Desktop, etc). Supports auto-scroll for animations.

[/map]
> Usage:   /map url:<link>
> Info:    Crawls the website to visualize the link structure and
           site hierarchy tree.

[/crawl-check]
> Usage:   /crawl-check url:<link> path:<path> bot:<type>
> Info:    Simulates search engine bots (Googlebot, Bing) to check 
           if a specific page path is blocked by robots.txt.

[/help]
> Usage:   /help
> Info:    Displays this message.

========================================
Bot maintained by: ${authorName}
\`\`\`
    `;

  await interaction.reply(report);
}