var Discord = require("discord.js");
var request = require("request");

var bot = new Discord.Client();

var loginToken = process.env.DISC_TOKEN;
var prefix = "$";
var cardData = {}

bot.on("message", msg => {
    if (msg.content.startsWith(prefix) &&
        msg.content.length > 1 && !msg.author.bot) {
        try {
            let args = msg.content.substring(1).split(" ");
            let command = args[0];
            console.log("Executing:", msg.content);
            if (command == "card-name") {
                cardNameCommand(args, msg);
            } else if (command == "card-search") {
                cardSearchCommand(args, msg);
            }
        } catch (err) {
            console.log(
                "Had error processing", msg.content, " error:", err
            );
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

function cardNameCommand(args, msg) {
    let subname = args.slice(1).join(" ").toLowerCase();
    let cardNames = Object.keys(cardData).filter(function(name) {
        return name.includes(subname);
    });
    outputCards(msg, cardNames);
};

function cardSearchCommand(args, msg) {
    let cardNames = Object.keys(cardData);
    for (var i = 1; i < args.length; i++) {
        let term = args[i].toLowerCase();
        cardNames = cardNames.filter(function(cardName) {
            return doesTermMatchCard(term, cardName);
        });
    }
    outputCards(msg, cardNames);
};

function sendFormattedCard(msg, cardName) {
    let card = cardData[cardName];
    let getIdleUrl = "http://www.bagoum.com/getIdle/" + encodeURIComponent(card.name);
    request(getIdleUrl, function(err, resp, idleAnimationUrl) {
        if (err) {
            console.log(err);
            return;
        }
        if (resp.statusCode != 200) {
            console.log("Unexpected response code:", resp.statusCode);
            return;
        }
        formattedText = card.name + "   " + card.manaCost + "\n" + 
            card.shortfaction + " " + card.type + " - " + card.expansion + "\n" +  
            card.description + "\n";
        if (card.type === "Unit") {
            formattedText += card.attack + "/" + card.health + "\n";
        }
        formattedText += "http://" + idleAnimationUrl;
        msg.channel.sendMessage(formattedText);
    });
};

function outputCards(msg, cardNames) {
    if (cardNames.length == 1) {
        sendFormattedCard(msg, cardNames[0]);
    } else if (cardNames.length > 1) {
        msg.channel.sendMessage(
            "Too many matches found, pm'ing you the names that matched your query"
        );
        msg.author.sendMessage(
            cardNames.join(", ")
        );
    } else {
        msg.channel.sendMessage(
            "Sorry, but I can't find a card with those parameters."
        );
    }
};

function doesTermMatchCard(term, cardName) {
    let card = cardData[cardName];
    return card.searchableText.indexOf(term) > -1;
};

function splitSearchableText(searchableText) {
    let re = /([0-9a-z])([A-Z])|([a-z])([0-9])|([0-9])([a-z])/g;
    searchableText = searchableText.replace(re, '$1$3$5 $2$4$6');
    return searchableText.split(/[ .,]/).map(function(term) {
        return term.toLowerCase()
    });
};

function buildCardData(cards) {
    for (var cardName in cards) {
        if (!cards.hasOwnProperty(cardName)) {
            continue;
        }
        card = cards[cardName];
        card.searchableText = splitSearchableText(card.searchableText);
        card.name = cardName;
        cardData[cardName.toLowerCase()] = card
    }
};

console.log("Building card storage...");
request("http://bagoum.com/cardsFullJSON", function(err, resp, body) {
    if (err) {
        console.log(err);
        return;
    }
    if (resp.statusCode != 200) {
        console.log("Invalid status code:", response.statusCode);
        return;
    }
    var cards = JSON.parse(body);
    buildCardData(cards);
    bot.login(loginToken);
});
