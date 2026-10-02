const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loa')
    .setDescription('Leave of Absence – temporarily pause quotas and warnings')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start your LOA')
        .addIntegerOption(opt =>
          opt.setName('days')
            .setDescription('How many days you will be away')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(90)
        )
        .addStringOption(opt =>
          opt.setName('reason')
            .setDescription('Optional reason')
        )
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End your LOA early')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Check your current LOA status')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const staff = db.getStaff(userId, guildId);

    if (!staff) {
      return interaction.reply({
        embeds: [errorEmbed('Not Staff', 'You are not registered as a staff member.')],
        ephemeral: true
      });
    }

    if (sub === 'start') {
      if (staff.on_loa) {
        return interaction.reply({
          embeds: [errorEmbed('Already on LOA', `You are already on LOA until ${staff.loa_until}.`)],
          ephemeral: true
        });
      }

      const days = interaction.options.getInteger('days');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const until = new Date();
      until.setDate(until.getDate() + days);

      db.upsertStaff(userId, guildId, {
        on_loa: 1,
        loa_until: until.toISOString()
      });

      db.addLog(guildId, 'staff_activity', `${interaction.user.tag} started LOA for ${days} days: ${reason}`, userId);

      await interaction.reply({
        embeds: [
          successEmbed(
            '✈️ LOA Started',
            `Your message quotas and warnings are now paused.\n` +
            `**Duration:** ${days} day(s)\n` +
            `**Until:** <t:${Math.floor(until.getTime() / 1000)}:F>\n` +
            `**Reason:** ${reason}\n\n` +
            `*Focus on what matters. We've got you covered.*`
          )
        ]
      });
    }

    else if (sub === 'end') {
      if (!staff.on_loa) {
        return interaction.reply({
          embeds: [errorEmbed('Not on LOA', 'You are not currently on Leave of Absence.')],
          ephemeral: true
        });
      }

      db.upsertStaff(userId, guildId, {
        on_loa: 0,
        loa_until: null
      });

      db.addLog(guildId, 'staff_activity', `${interaction.user.tag} ended LOA`, userId);

      await interaction.reply({
        embeds: [
          successEmbed(
            '👋 Welcome Back!',
            'Your LOA has ended. Quotas and warnings are active again.'
          )
        ]
      });
    }

    else if (sub === 'status') {
      if (staff.on_loa) {
        await interaction.reply({
          embeds: [
            infoEmbed(
              '✈️ LOA Status',
              `You are currently on Leave of Absence.\n` +
              `**Until:** ${staff.loa_until ? `<t:${Math.floor(new Date(staff.loa_until).getTime() / 1000)}:F>` : 'Unknown'}`
            )
          ],
          ephemeral: true
        });
      } else {
        await interaction.reply({
          embeds: [
            infoEmbed('LOA Status', 'You are **not** currently on Leave of Absence.')
          ],
          ephemeral: true
        });
      }
    }
  }
};
