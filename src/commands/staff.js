const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const { successEmbed, errorEmbed, infoEmbed, warningEmbed } = require('../utils/embeds');
const config = require('../../config/default');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Staff management commands')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View staff statistics & quotas')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Specific staff member (leave empty for overview)')
        )
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Check detailed staff member info')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('warnings')
        .setDescription('View warning history')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('warn')
        .setDescription('Issue a disciplinary action')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Staff member')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Type of action')
            .setRequired(true)
            .addChoices(
              { name: '⚠️ Official Warning', value: 'official_warning' },
              { name: '💬 Warning & Talk', value: 'warning_and_talk' },
              { name: '⬇️ Temporary Demotion', value: 'temporary_demotion' },
              { name: '❌ Full Removal', value: 'full_removal' }
            )
        )
        .addStringOption(opt =>
          opt.setName('reason')
            .setDescription('Reason for the action')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a user as staff (assigns global role + category)')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to add as staff')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Staff category')
            .setRequired(true)
            .addChoices(
              { name: 'Management', value: 'Management' },
              { name: 'HR', value: 'HR' },
              { name: 'Administration', value: 'Administration' },
              { name: 'Moderation', value: 'Moderation' },
              { name: 'Advertising & Growth', value: 'Advertising & Growth' }
            )
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'status') {
      const target = interaction.options.getUser('user');

      if (target) {
        const staff = db.getStaff(target.id, guildId);
        if (!staff) {
          return interaction.reply({
            embeds: [errorEmbed('Not Staff', `${target} is not registered as staff.`)],
            ephemeral: true
          });
        }

        const count = db.getMessageCount(target.id, guildId);
        const categories = db.getCategories(guildId);
        const cat = categories.find(c => c.name === staff.category);
        const quota = cat ? cat.weekly_quota : 50;
        const progress = Math.min(100, Math.round((count / quota) * 100));
        const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

        await interaction.reply({
          embeds: [
            infoEmbed(
              `📊 Staff Status – ${target.tag}`,
              `**Category:** ${staff.category || 'None'}\n` +
              `**On LOA:** ${staff.on_loa ? 'Yes ✈️' : 'No'}\n` +
              `**This Week:** ${count} / ${quota} messages\n` +
              `\`${bar}\` ${progress}%`
            )
          ]
        });
      } else {
        const allStaff = db.getAllStaff(guildId);
        const categories = db.getCategories(guildId);

        let desc = `**Total Staff:** ${allStaff.length}\n\n`;
        for (const cat of categories) {
          const members = allStaff.filter(s => s.category === cat.name);
          desc += `**${cat.name}** (Quota: ${cat.weekly_quota})\n`;
          if (members.length === 0) {
            desc += `• No members\n`;
          } else {
            for (const m of members.slice(0, 5)) {
              const count = db.getMessageCount(m.user_id, guildId);
              desc += `• <@${m.user_id}> – ${count}/${cat.weekly_quota}${m.on_loa ? ' ✈️' : ''}\n`;
            }
            if (members.length > 5) desc += `• ...and ${members.length - 5} more\n`;
          }
          desc += '\n';
        }

        await interaction.reply({
          embeds: [infoEmbed('📊 Staff Overview', desc || 'No staff configured yet.')]
        });
      }
    }

    else if (sub === 'info') {
      const target = interaction.options.getUser('user');
      const staff = db.getStaff(target.id, guildId);
      const warnings = db.getWarnings(target.id, guildId);
      const count = db.getMessageCount(target.id, guildId);

      if (!staff) {
        return interaction.reply({
          embeds: [errorEmbed('Not Found', `${target} is not a staff member.`)],
          ephemeral: true
        });
      }

      await interaction.reply({
        embeds: [
          infoEmbed(
            `ℹ️ Staff Info – ${target.tag}`,
            `**User:** ${target}\n` +
            `**Category:** ${staff.category || 'None'}\n` +
            `**Joined:** ${staff.joined_at}\n` +
            `**On LOA:** ${staff.on_loa ? `Yes until ${staff.loa_until || 'unknown'}` : 'No'}\n` +
            `**Messages this week:** ${count}\n` +
            `**Active Warnings:** ${warnings.length}`
          )
        ]
      });
    }

    else if (sub === 'warnings') {
      const target = interaction.options.getUser('user');
      const warnings = db.getWarnings(target.id, guildId, false);

      if (!warnings.length) {
        return interaction.reply({
          embeds: [successEmbed('Clean Record', `${target} has no warnings.`)],
          ephemeral: true
        });
      }

      const list = warnings.map((w, i) => {
        const typeInfo = config.disciplinary[w.type] || { name: w.type, emoji: '⚠️' };
        return `**${i + 1}.** ${typeInfo.emoji} ${typeInfo.name}\n` +
               `Reason: ${w.reason || 'No reason'}\n` +
               `Issued: ${w.issued_at} by <@${w.issued_by}>\n` +
               `Expires: ${w.expires_at || 'Never'}\n` +
               `Active: ${w.active ? 'Yes' : 'No'}`;
      }).join('\n\n');

      await interaction.reply({
        embeds: [warningEmbed(`⚠️ Warnings – ${target.tag}`, list)],
        ephemeral: true
      });
    }

    else if (sub === 'warn') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) &&
          !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          embeds: [errorEmbed('Permission Denied', 'You need Moderate Members or Administrator permission.')],
          ephemeral: true
        });
      }

      const target = interaction.options.getUser('user');
      const type = interaction.options.getString('type');
      const reason = interaction.options.getString('reason');
      const typeInfo = config.disciplinary[type];

      db.addWarning(target.id, guildId, type, reason, interaction.user.id);
      db.addLog(guildId, 'staff_activity', `Warning issued to ${target.tag}: ${typeInfo.name} – ${reason}`, interaction.user.id);

      if (type === 'full_removal') {
        db.upsertStaff(target.id, guildId, { category: null, roles: '[]' });
      }

      await interaction.reply({
        embeds: [
          warningEmbed(
            `${typeInfo.emoji} Disciplinary Action Issued`,
            `**Target:** ${target}\n` +
            `**Type:** ${typeInfo.name}\n` +
            `**Reason:** ${reason}\n` +
            `**Issued by:** ${interaction.user}\n\n` +
            `*Warnings reset every 10 weeks.*`
          )
        ]
      });

      try {
        await target.send({
          embeds: [
            warningEmbed(
              `${typeInfo.emoji} You received a disciplinary action`,
              `**Server:** ${interaction.guild.name}\n` +
              `**Type:** ${typeInfo.name}\n` +
              `**Reason:** ${reason}\n` +
              `**Issued by:** ${interaction.user.tag}`
            )
          ]
        });
      } catch {}
    }

    else if (sub === 'add') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          embeds: [errorEmbed('Permission Denied', 'Only Administrators can add staff.')],
          ephemeral: true
        });
      }

      const target = interaction.options.getUser('user');
      const category = interaction.options.getString('category');
      const settings = db.getGuildSettings(guildId);

      db.upsertStaff(target.id, guildId, { category, roles: '[]' });

      if (settings?.global_staff_role) {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member) {
          await member.roles.add(settings.global_staff_role).catch(() => {});
        }
      }

      db.addLog(guildId, 'role_change', `Added ${target.tag} as staff in ${category}`, interaction.user.id);

      await interaction.reply({
        embeds: [
          successEmbed(
            '✅ Staff Member Added',
            `${target} has been added to **${category}**.\n` +
            (settings?.global_staff_role ? `Global staff role <@&${settings.global_staff_role}> assigned.` : 'No global role configured.')
          )
        ]
      });
    }
  }
};
