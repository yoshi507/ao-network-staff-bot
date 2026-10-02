module.exports = {
  // Default weekly message quotas per category
  quotas: {
    'Management': 40,
    'HR': 50,
    'Administration': 50,
    'Moderation': 50,
    'Advertising & Growth': 50
  },

  // Warning reset period in weeks
  warningResetWeeks: 10,

  // Colors for embeds
  colors: {
    primary: 0x00BFFF,      // Cyan/Blue
    success: 0x00FF7F,      // Green
    warning: 0xFFA500,      // Orange
    danger: 0xFF4500,       // Red
    info: 0x5865F2          // Discord Blurple
  },

  // Disciplinary action types
  disciplinary: {
    official_warning: {
      name: 'Official Warning',
      description: 'Minor issue, official record.',
      emoji: '⚠️'
    },
    warning_and_talk: {
      name: 'Warning & Talk',
      description: 'Discussion with staff member.',
      emoji: '💬'
    },
    temporary_demotion: {
      name: 'Temporary Demotion',
      description: 'Removed from current role (temporary).',
      emoji: '⬇️'
    },
    full_removal: {
      name: 'Full Removal',
      description: 'Removed from staff team.',
      emoji: '❌'
    }
  }
};
