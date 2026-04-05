require("dotenv").config();

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("R6 Rank Bot is running ✅");
});

app.listen(3000, () => {
  console.log("Keep-alive server running");
});

const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🎨 Rank styles
const rankStyles = {
  Copper:   { roleId: "ROLE_ID_1", color: "#b87333" },
  Bronze:   { roleId: "ROLE_ID_2", color: "#cd7f32" },
  Silver:   { roleId: "ROLE_ID_3", color: "#c0c0c0" },
  Gold:     { roleId: "ROLE_ID_4", color: "#ffd700" },
  Platinum: { roleId: "ROLE_ID_5", color: "#00bfff" },
  Emerald:  { roleId: "ROLE_ID_6", color: "#50c878" },
  Diamond:  { roleId: "ROLE_ID_7", color: "#1e90ff" },
  Champion: { roleId: "ROLE_ID_8", color: "#ff4da6" }
};

// 📊 Get peak rank
async function getPeakRank(username) {
  try {
    const res = await axios.get(
      `https://public-api.tracker.gg/v2/r6siege/standard/profile/ubi/${username}`,
      {
        headers: {
          "TRN-Api-Key": process.env.TRACKER_API_KEY
        }
      }
    );

    const segments = res.data.data.segments;
    const ranked = segments.find(s => s.type === "ranked");

    if (!ranked) return null;

    return (
      ranked.stats?.maxRank?.metadata?.rankName ||
      ranked.stats?.peakRank?.metadata?.rankName ||
      ranked.stats?.rank?.metadata?.rankName ||
      "Unknown"
    );
  } catch (err) {
    console.log("API error:", err.response?.data || err.message);
    return null;
  }
}

// 🧠 Role updater
async function updateRole(member, rank) {
  const guild = member.guild;

  // remove old rank roles
  for (const data of Object.values(rankStyles)) {
    const role = guild.roles.cache.get(data.roleId);
    if (role && member.roles.cache.has(role.id)) {
      await member.roles.remove(role).catch(() => {});
    }
  }

  const rankData = rankStyles[rank];
  if (!rankData) return;

  let role = guild.roles.cache.get(rankData.roleId);

  if (!role) {
    role = await guild.roles.create({
      name: rank,
      color: rankData.color,
      permissions: []
    });
  } else {
    await role.setColor(rankData.color).catch(() => {});
  }

  await member.roles.add(role).catch(console.error);
}

// 💬 Command
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!rank")) {
    const username = message.content.split(" ")[1];

    if (!username) {
      return message.reply("Usage: `!rank <ubisoft_username>`");
    }

    message.reply("Fetching R6 Tracker data... 🎮");

    const rank = await getPeakRank(username);

    if (!rank) {
      return message.reply("Could not fetch rank.");
    }

    await updateRole(message.member, rank);

    message.channel.send(`🏆 Peak Rank: **${rank}** → role updated.`);
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
