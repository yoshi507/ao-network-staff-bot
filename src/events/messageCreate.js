const db = require('../utils/database');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config/default');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const settings = db.getGuildSettings(guildId);

    // Partnership Submission Flow
    if (settings?.partnership_submission_channel && message.channel.id === settings.partnership_submission_channel) {
      await handlePartnershipSubmission(message, client, settings);
      return;
    }

    // Staff Message Quota Tracking
    const staff = db.getStaff(userId, guildId);
    if (staff && !staff.on_loa) {
      db.incrementMessageCount(userId, guildId);
    }
  }
};

async function handlePartnershipSubmission(message, client, settings) {
  const content = message.content;
  const screenshot = message.attachments.find(a => a.contentType?.startsWith('image/'));
  const hasHiddenPing = /@(everyone|here)|<@&\d+>/i.test(content);

  if (hasHiddenPing) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.danger)
          .setTitle('❌ Hidden Pings Detected')
          .setDescription('Partnership ads with `@everyone`, `@here`, or role pings are **blocked**.\nPlease remove them and try again.')
      ]
    });
    return;
  }

  const result = db.addPartnershipSubmission(
    message.guild.id,
    message.author.id,
    content,
    screenshot ? screenshot.url : null
  );

  if (!screenshot) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('📸 Screenshot Required')
          .setDescription('Please send a screenshot (SS) of the partnership / advertisement.\nThe bot will continue once both the ad and screenshot are received.')
      ]
    });
    return;
  }

  const isValid = content.length > 20 && !hasHiddenPing;

  if (isValid) {
    if (settings.partnership_channel) {
      const partnerChannel = await client.channels.fetch(settings.partnership_channel).catch(() => null);
      if (partnerChannel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🤝 New Partnership')
          .setDescription(content)
          .setImage(screenshot.url)
          .setFooter({ text: `Submitted by ${message.author.tag}` })
          .setTimestamp();

        await partnerChannel.send({ embeds: [embed] });
      }
    }

    if (settings.partnership_log_channel) {
      const logChannel = await client.channels.fetch(settings.partnership_log_channel).catch(() => null);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.success)
              .setTitle('✅ Partnership Auto-Posted')
              .addFields(
                { name: 'Submitted by', value: `${message.author}`, inline: true },
                { name: 'Status', value: 'VALID – Auto-posted', inline: true }
              )
              .setTimestamp()
          ]
        });
      }
    }

    db.updatePartnershipStatus(result.lastInsertRowid, 'posted');
    db.addLog(message.guild.id, 'partnership', `Auto-posted partnership from ${message.author.tag}`, message.author.id);

    const staff = db.getStaff(message.author.id, message.guild.id);
    if (staff && !staff.on_loa) {
      db.incrementMessageCount(message.author.id, message.guild.id);
    }

    await message.react('✅');
  } else {
    db.updatePartnershipStatus(result.lastInsertRowid, 'failed');

    if (settings.partnership_log_channel) {
      const logChannel = await client.channels.fetch(settings.partnership_log_channel).catch(() => null);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle('⚠️ Partnership Needs Verification')
              .setDescription('Submission flagged as unsure/failed. Only a Server Admin can verify.')
              .addFields(
                { name: 'Submitted by', value: `${message.author}`, inline: true },
                { name: 'Content Preview', value: content.slice(0, 200) || 'No text' }
              )
              .setTimestamp()
          ]
        });
      }
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('⚠️ Needs Admin Verification')
          .setDescription('This submission could not be auto-validated.\nA Server Admin must verify it before it is posted.')
      ]
    });
  }
}
