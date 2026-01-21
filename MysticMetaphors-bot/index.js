import { Client, GatewayIntentBits, REST, Routes, Collection, Events } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Setup Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Attach a custom property for Author Name (so commands can access it)
try {
  const packageJSON = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  client.authorName = packageJSON.author?.name || packageJSON.author || "Unknown";
} catch (e) { client.authorName = "Unknown"; }

// --- COMMAND HANDLER ---
client.commands = new Collection();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Array to send to Discord API for registration
const commandsPayload = [];

// Dynamic Import Loop
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commandsPayload.push(command.data.toJSON());
  } else {
    console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
  }
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

client.once(Events.ClientReady, async () => {
  console.log(`Bot Logged in as ${client.user.tag}`);
  
  // Register Commands
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log(`Started refreshing ${commandsPayload.length} application (/) commands.`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandsPayload });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.login(TOKEN);