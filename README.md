# 🤖 AO Network Staff Management System

**Role-Based • Automated Tracking • Customizable Setup • Full Transparency**

A complete Discord bot that implements the full AO Network Staff Management System shown in the official design.

## ✨ Features

### 🔧 Role & Category Setup
- `/setup <category>` – Create categories and assign roles
- Organize your entire staff structure in minutes

### 📋 Application Setup
- Create application positions
- Up to 25 roles on approval
- Fully customizable application system

### 👥 Global Staff Role
- One role every new staff member automatically receives upon approval

### 🤝 Partnership System (NEW)
- Dedicated partnership flow with submission channel
- Auto-post validated ads
- Screenshot + ad validation
- Quota counting & logging
- Hidden pings blocked
- Admin verification for edge cases

### 📊 Staff Tracking & Quotas
| Category              | Weekly Message Quota |
|-----------------------|----------------------|
| Management            | 40                   |
| HR                    | 50                   |
| Administration        | 50                   |
| Moderation            | 50                   |
| Advertising & Growth  | 50                   |

Real-time quota tracking per staff member.

### 🛡️ Disciplinary System
- **Official Warning** – Minor issue, official record
- **Warning & Talk** – Discussion with staff member
- **Temporary Demotion** – Removed from current role (temporary)
- **Full Removal** – Removed from staff team
- Warnings reset every **10 weeks**

### 📌 Commands
| Command            | Description                    |
|--------------------|--------------------------------|
| `/setup`           | Set up system features         |
| `/staff status`    | View staff statistics          |
| `/staff info`      | Check staff member info        |
| `/staff warnings`  | View warning history           |
| `/loa`             | Temporarily pause quotas/warnings while on leave |

### 📜 Logs & Notifications
- Partnership logs
- Staff activity logs
- Application logs
- Role change logs

### ✈️ LOA System
`/loa` temporarily pauses your message quotas and warnings while on leave.

### ⚙️ Auto Features
- ✅ Automatic role assignment
- ✅ Quota tracking (real-time)
- ✅ Automatic warnings system
- ✅ Auto-post partnership ads
- ✅ Log everything automatically
- ✅ Fully customizable setup
- ✅ Reliable & always active

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18 or higher
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

### 2. Installation

```bash
git clone https://github.com/yoshi507/ao-network-staff-bot.git
cd ao-network-staff-bot
npm install
```

### 3. Configuration

```bash
cp .env.example .env
```

Edit `.env` and add:
- `DISCORD_TOKEN` – Your bot token
- `CLIENT_ID` – Your application/client ID
- `GUILD_ID` – (Optional) Your server ID for faster slash command updates

### 4. Invite the Bot

Use this URL (replace `CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

**Recommended permissions:** Administrator (or at minimum: Manage Roles, Manage Channels, Send Messages, Embed Links, Read Message History, Manage Messages)

### 5. Deploy Slash Commands

```bash
npm run deploy-commands
```

### 6. Start the Bot

```bash
npm start
```

---

## 📁 Project Structure

```
ao-network-staff-bot/
├── src/
│   ├── commands/          # Slash commands
│   ├── events/            # Discord event handlers
│   ├── handlers/          # Command & event loaders
│   ├── utils/             # Database, helpers, embeds
│   ├── deploy-commands.js
│   └── index.js           # Bot entry point
├── data/                  # SQLite database (auto-created)
├── config/                # Default configuration
├── .env.example
├── package.json
└── README.md
```

---

## 🛠️ Setup Guide (First Time)

1. Run `/setup` in your server (Administrator only)
2. Configure categories & roles with `/setup category`
3. Set up application system with `/setup application`
4. Configure partnership channels with `/setup partnership`
5. Set the Global Staff Role
6. Done! The bot will start tracking automatically.

---

## 📝 Notes

- All data is stored in a local SQLite database (`data/staff.db`)
- Quotas reset every Monday at 00:00 UTC
- Warnings expire after 10 weeks
- Partnership ads are auto-posted only after validation
- Hidden pings (`@everyone`, `@here`, role pings) are blocked in partnership submissions

---

## 🤝 Contributing

Feel free to open issues or pull requests!

---

**AO NETWORK • MORE CONTROL • LESS MANUAL WORK**

*A stronger team. A brighter tomorrow.* 💙
