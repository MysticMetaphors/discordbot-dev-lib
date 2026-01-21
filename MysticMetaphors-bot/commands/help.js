import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List all available commands and how to use them');

export async function execute(interaction) {
  const authorName = interaction.client.authorName || "Bot";
  
  const helpEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Web Tools Bot Help')
    .setDescription('Here are the available commands to help you test and preview websites.')
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .addFields(
      { 
        name: '/audit', 
        value: '> **Usage:** `/audit url:<link>`\n> Runs a full technical audit including Lighthouse scores (Performance & SEO), security headers (SSL, HSTS), and tech stack detection.' 
      },
      { 
        name: '/preview', 
        value: '> **Usage:** `/preview url:<link> device:<type>`\n> Takes a high-resolution screenshot of a site on a specific device (e.g., iPhone 14, Desktop, iPad).' 
      },
      {
        name: '/map',
        value: '> **Usage:** `/map url:<link>`\n> Visualize the website structure'
      },
      { 
        name: '/help', 
        value: '> Displays this message.' 
      }
    )
    .setFooter({ text: `Maintained by: ${authorName}` })
    .setTimestamp();

  await interaction.reply({ embeds: [helpEmbed] });
}