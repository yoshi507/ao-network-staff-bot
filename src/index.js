require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

client.commands = new Collection();

async function start() {
  try {
    console.log('🚀 Starting AO Network Staff Management Bot...');

    await loadCommands(client);
    await loadEvents(client);

    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});
