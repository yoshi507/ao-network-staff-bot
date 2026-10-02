require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

    let data;
    if (process.env.GUILD_ID) {
      // Guild commands (faster for testing)
      data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} guild commands.`);
    } else {
      // Global commands
      data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} global commands.`);
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
