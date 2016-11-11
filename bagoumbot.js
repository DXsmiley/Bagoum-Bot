var Discord = require("discord.js");
var bot = new Discord.Client();

var loginToken = process.env.DISC_TOKEN;
var prefix = "$";

bot.on("message", msg => {
    if (msg.content.startsWith(prefix) &&
        msg.content.length > 1 && !msg.author.bot) {
        let args = msg.content.substring(1).split(" ");
        let command = args[0];
        if (command == "echo") {
            msg.channel.sendMessage(args.slice(1).join(" "));
        }
    }
});

bot.on('ready', () => {
    console.log(`Bot logged on to ${bot.channels.map(x => {
        return x.name;
    })}`);
});

bot.on("guildMemberAdd", (member) => {
    member.guild.defaultChannel.sendMessage(`Welcome, ${member.user.username}!`)
});

bot.on("disconnected", () => {
    bot.login(loginToken);
});

bot.login(loginToken);