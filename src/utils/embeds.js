const { EmbedBuilder } = require('discord.js');
const config = require('../../config/default');

function baseEmbed(title, description, color = config.colors.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'AO Network • Staff Management System' });
}

function successEmbed(title, description) {
  return baseEmbed(title, description, config.colors.success);
}

function errorEmbed(title, description) {
  return baseEmbed(title, description, config.colors.danger);
}

function warningEmbed(title, description) {
  return baseEmbed(title, description, config.colors.warning);
}

function infoEmbed(title, description) {
  return baseEmbed(title, description, config.colors.info);
}

module.exports = {
  baseEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed
};
