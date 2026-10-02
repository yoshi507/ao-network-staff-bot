const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../utils/database');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');
const config = require('../../config/default');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up AO Network Staff Management System features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('category')
        .setDescription('Create or configure a staff category with roles')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Category name (e.g. Management, HR, Moderation)')
            .setRequired(true)
            .addChoices(
              { name: 'Management', value: 'Management' },
              { name: 'HR', value: 'HR' },
              { name: 'Administration', value: 'Administration' },
              { name: 'Moderation', value: 'Moderation' },
              { name: 'Advertising & Growth', value: 'Advertising & Growth' },
              { name: 'Custom', value: 'Custom' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('quota')
            .setDescription('Weekly message quota')
            .setMinValue(1)
            .setMaxValue(500)
        )
        .addRoleOption(opt =>
          opt.setName('role1').setDescription('First role for this category')
        )
        .addRoleOption(opt =>
          opt.setName('role2').setDescription('Second role for this category')
        )
        .addRoleOption(opt =>
          opt.setName('role3').setDescription('Third role for this category')
        )
    )
    .addSubcommand(sub =>
      sub.setName('application')
        .setDescription('Configure the application system')
        .addStringOption(opt =>
          opt.setName('position')
            .setDescription('Name of the application position')
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('Role to give on approval (you can run multiple times for up to 25)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('globalrole')
        .setDescription('Set the Global Staff Role (auto-assigned to every new staff)')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('The global staff role')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('partnership')
        .setDescription('Configure the Partnership System')
        .addChannelOption(opt =>
          opt.setName('submission')
            .setDescription('Channel where PMs submit ads + screenshots')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('partnerships')
            .setDescription('Channel where validated ads are auto-posted')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('log')
            .setDescription('Log channel for partnership activity')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('admin_verify')
            .setDescription('Role that can manually verify unsure submissions')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('logs')
        .setDescription('Set the main staff activity log channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Log channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current setup status')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (!db.getGuildSettings(guildId)) {
      db.setGuildSetting(guildId, 'setup_complete', 0);
    }

    if (sub === 'category') {
      let name = interaction.options.getString('name');
      if (name === 'Custom') name = 'Custom Category';
      const quota = interaction.options.getInteger('quota') || config.quotas[name] || 50;
      const roles = [
        interaction.options.getRole('role1'),
        interaction.options.getRole('role2'),
        interaction.options.getRole('role3')
      ].filter(Boolean);

      db.addCategory(guildId, name, quota);
      const categories = db.getCategories(guildId);
      const cat = categories.find(c => c.name === name);

      if (cat && roles.length) {
        for (const role of roles) {
          db.addCategoryRole(cat.id, role.id);
        }
      }

      await interaction.reply({
        embeds: [
          successEmbed(
            '✅ Category Configured',
            `**${name}** has been set up with a weekly quota of **${quota}** messages.\n` +
            (roles.length ? `Roles linked: ${roles.map(r => r.toString()).join(', ')}` : 'No roles linked yet. Re-run to add more.')
          )
        ],
        ephemeral: true
      });
    }

    else if (sub === 'application') {
      const position = interaction.options.getString('position');
      const role = interaction.options.getRole('role');

      db.db.prepare(`
        INSERT INTO applications (guild_id, name, roles) VALUES (?, ?, ?)
      `).run(guildId, position, JSON.stringify([role.id]));

      await interaction.reply({
        embeds: [
          successEmbed(
            '📋 Application Position Created',
            `Position **${position}** will grant ${role} upon approval.\nYou can run this command again to add more roles (up to 25).`
          )
        ],
        ephemeral: true
      });
    }

    else if (sub === 'globalrole') {
      const role = interaction.options.getRole('role');
      db.setGuildSetting(guildId, 'global_staff_role', role.id);

      await interaction.reply({
        embeds: [
          successEmbed(
            '👥 Global Staff Role Set',
            `${role} will now be automatically assigned to every new staff member upon approval.`
          )
        ],
        ephemeral: true
      });
    }

    else if (sub === 'partnership') {
      const submission = interaction.options.getChannel('submission');
      const partnerships = interaction.options.getChannel('partnerships');
      const log = interaction.options.getChannel('log');
      const adminRole = interaction.options.getRole('admin_verify');

      db.setGuildSetting(guildId, 'partnership_submission_channel', submission.id);
      db.setGuildSetting(guildId, 'partnership_channel', partnerships.id);
      db.setGuildSetting(guildId, 'partnership_log_channel', log.id);
      db.setGuildSetting(guildId, 'admin_verify_role', adminRole.id);

      await interaction.reply({
        embeds: [
          successEmbed(
            '🤝 Partnership System Configured',
            `**Submission channel:** ${submission}\n` +
            `**Partnerships (auto-post):** ${partnerships}\n` +
            `**Log channel:** ${log}\n` +
            `**Admin verify role:** ${adminRole}\n\n` +
            `Flow is now live:\n` +
            `1. PM posts ad in submission channel\n` +
            `2. Bot asks for screenshot if missing\n` +
            `3. Bot validates (no hidden pings)\n` +
            `4. Valid → auto-posts + logs + counts quota`
          )
        ],
        ephemeral: true
      });
    }

    else if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      db.setGuildSetting(guildId, 'log_channel', channel.id);

      await interaction.reply({
        embeds: [
          successEmbed('📜 Log Channel Set', `Staff activity logs will be sent to ${channel}.`)
        ],
        ephemeral: true
      });
    }

    else if (sub === 'status') {
      const settings = db.getGuildSettings(guildId) || {};
      const categories = db.getCategories(guildId);

      const status = [
        `**Global Staff Role:** ${settings.global_staff_role ? `<@&${settings.global_staff_role}>` : '❌ Not set'}`,
        `**Partnership Submission:** ${settings.partnership_submission_channel ? `<#${settings.partnership_submission_channel}>` : '❌ Not set'}`,
        `**Partnership Channel:** ${settings.partnership_channel ? `<#${settings.partnership_channel}>` : '❌ Not set'}`,
        `**Partnership Log:** ${settings.partnership_log_channel ? `<#${settings.partnership_log_channel}>` : '❌ Not set'}`,
        `**Staff Log Channel:** ${settings.log_channel ? `<#${settings.log_channel}>` : '❌ Not set'}`,
        `\n**Categories (${categories.length}):**`,
        categories.length
          ? categories.map(c => `• ${c.name} – Quota: ${c.weekly_quota}`).join('\n')
          : 'None configured yet'
      ].join('\n');

      await interaction.reply({
        embeds: [infoEmbed('🔧 Setup Status', status)],
        ephemeral: true
      });
    }
  }
};
