var Discord = require("discord.js");
var bot = new Discord.Client();

var loginToken = process.env.DISC_TOKEN;

bot.on("message", msg => {
    if (msg.content.startsWith("ping")) {
        msg.channel.sendMessage("pong!");
    }
});

bot.on('ready', () => {
  console.log('I am ready!');
});

bot.login(loginToken);