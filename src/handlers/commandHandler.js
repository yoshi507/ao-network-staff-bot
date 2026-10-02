const fs = require('fs');
const path = require('path');

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: /${command.data.name}`);
    } else {
      console.warn(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }
}

module.exports = { loadCommands };
