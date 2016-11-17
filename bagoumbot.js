var cheerio = require("cheerio");
var Discord = require("discord.js");
var request = require("request");

var bot = new Discord.Client();

var loginToken = process.env.DISCORD_TOKEN;
var prefix = "$";
var cardData = {};
var tierlistData = [];
var messageQueues = {};
const MAX_QUEUE_SIZE = 50;
const DO_DISCORD_INV = "https://discord.gg/0WbpmyLbu52EBhiw";


bot.on("message", msg => {
    if (msg.content.startsWith(prefix) &&
        msg.content.length > 1 && !msg.author.bot) {
        try {
            let args = msg.content.substring(1).split(" ");
            let command = args[0].toLowerCase();
            console.log("Executing:", msg.content);
            if (["card-name", "name"].indexOf(command) > -1) {
                cardNameCommand(args, msg);
            } else if (["card-search", "card", "search"].indexOf(command) > -1) {
                cardSearchCommand(args, msg);
            } else if (["tierlist", "tl"].indexOf(command) > -1) {
                tierlistCommand(args, msg);
            } else if (["bagoum"].indexOf(command) > -1) {
                linkToBagoum(msg);
            } else if (["notation"].indexOf(command) > -1) {
                linkToNotation(msg);
            } else if (["deckbuilder", "db"].indexOf(command) > -1) {
                linkToDB(msg);
            } else if (["reddit", "subreddit"].indexOf(command) > -1) {
                linkToReddit(msg);
            } else if (["discord", "do"].indexOf(command) > -1) {
                linkToDiscord(msg);
            } else if (["forum", "forums"].indexOf(command) > -1) {
                linkToForums(msg);
            } else if (["stream", "streams", "twitch", "strim"].indexOf(command) > -1) {
                linkToTwitch(msg);
            } else if (["tournament", "tournaments", "tourney", "tourneys", "battlefy"].indexOf(command) > -1) {
                linkToBattlefy(msg);
            } else if (["discoverable", "discover"].indexOf(command) > -1) {
                meme("discoverable.png", msg);
            } else if (command == "clean") {
                cleanChannel(msg.channel);
            } else if (command == "help") {
                helpCommand(msg);
            } else {
                cardSearchCommand(["card-search"].concat(args), msg);
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
    sendMessage(member.guild.defaultChannel, `Welcome, ${member.user.username}!`);
});

bot.on("disconnected", () => {
    bot.login(loginToken);
});

function sendMessage(channel, message) {
    channel.sendMessage(message)
        .then(message => {
            addMessageToQueue(channel, message);
        })
        .catch(console.log);
}

function addMessageToQueue(channel, message) {
    let channel_id = channel.id;
    if (!messageQueues[channel_id]) {
        messageQueues[channel_id] = {
            'index': -1,
            'queue': []
        };
    }
    let queue = messageQueues[channel_id];
    queue.index = (queue.index + 1) % MAX_QUEUE_SIZE;
    if (queue.queue.length == MAX_QUEUE_SIZE) {
        queue.queue[queue.index] = message;
    } else {
        queue.queue.push(message);
    }
}

function cardNameCommand(args, msg) {
    let subname = args.slice(1).join(" ").toLowerCase();
    let cardNames = Object.keys(cardData).filter(function (name) {
        return name.includes(subname);
    });
    outputCards(msg, cardNames);
}

function cardSearchCommand(args, msg) {
    let cardNames = Object.keys(cardData);
    for (var i = 1; i < args.length; i++) {
        let term = args[i].toLowerCase();
        cardNames = cardNames.filter(function (cardName) {
            return doesTermMatchCard(term, cardName);
        });
    }
    outputCards(msg, cardNames);
}

function tierlistCommand(args, msg) {
    let decks = tierlistData;
    if (args.length == 1) {
        sendMessage(msg.channel, "The Bagoum tierlist can be found here:\n\thttp://www.bagoum.com/tierlist.html");
        return;
    }
    for (var i = 1; i < args.length; i++) {
        let term = args[i].toLowerCase();
        decks = decks.filter(function (deck) {
            return deck.terms.indexOf(term) > -1
        });
    }
    if (!decks.length) {
        sendMessage(msg.channel, "No decks found with that query");
        return;
    }
    var output = "";
    if (decks.length > 1) {
        output += "Found " + decks.length +
            " matching decks, fetching the best one...\n";
    }
    output += formatDeck(decks[0]);
    sendMessage(msg.channel, output);
}

function cleanChannel(channel) {
    let queue = messageQueues[channel.id];
    if (queue) {
        for (var i = 0; i < queue.queue.length; i++) {
            let message = queue.queue[i];
            message.delete();
        }
        messageQueues[channel.id] = null;
    }
    sendMessage(
        channel,
        "Messages have been attempted to be cleaned " +
        "(may fail if BagoumBot does not have permissions)"
    );
}

function helpCommand(msg) {
    msg.author.sendMessage(
        "__$card-name__ _name_\n" +
        "Finds card(s) with the given name\n" +
        "\tAlternate forms: $name\n\n" +
        "__$card-search__ _term1 term2_...\n" +
        "Finds card(s) that match the given terms\n" +
        "\tAlternate forms: $card, $search, $\n\n" +
        "__$tierlist__ _term1 term2_...\n" +
        "Finds the best deck that match the given terms " +
        "(when no term is given returns the best tierlist)\n" +
        "\tAlternate forms: $tl\n\n" +
        "__$clean__\n" +
        "Deletes the last " + MAX_QUEUE_SIZE + " messages from BagoumBot\n\n" +
        "__$bagoum__, __$notation__, __$deckbuilder__\n" +
        "Returns relevant links to the Bagoum Duelyst website\n\n" +
        "__$reddit__, __$discord__, __$forums__, __$twitch__, __$tourneys__\n" +
        "Returns relevant links to other Duelyst resources"
    )
}

function linkToBagoum(msg) {
    sendMessage(msg.channel,
        "Bagoum, the one-stop site for all your Duelyst needs!\n\thttp://www.bagoum.com");
}
function linkToNotation(msg) {
    sendMessage(msg.channel,
        "A guide to Duelyst notation can be found here:\n\thttp://www.bagoum.com/notation.html");
}
function linkToDB(msg) {
    sendMessage(msg.channel,
        "The Bagoum deckbuilder can be found here:\n\thttp://www.bagoum.com/deckbuilder");
}

function linkToReddit(msg) {
    sendMessage(msg.channel,
        "Duelyst Subreddit:\n\thttps://www.reddit.com/r/duelyst/");
}

function linkToDiscord(msg) {
    sendMessage(msg.channel,
        `Duelyst Official Discord:\n\t${DO_DISCORD_INV}`);
}

function linkToForums(msg) {
    sendMessage(msg.channel,
        "Duelyst Official Forums:\n\thttps://forums.duelyst.com/");
}

function linkToTwitch(msg) {
    sendMessage(msg.channel,
        "Duelyst on Twitch:\n\thttps://www.twitch.tv/directory/game/Duelyst");
}

function linkToBattlefy(msg) {
    sendMessage(msg.channel,
        "Duelyst tournaments on Battlefy:\n\thttps://battlefy.com/discovery/duelyst\n" +
        "Duelyst tournament Discord server:\n\thttps://discord.gg/q6YWGTm");
}

function meme(imgLink, msg) {
    sendMessage(msg.channel,
    "http://www.bagoum.com/images/memes/" + imgLink);
}

function formatDeck(deck) {
    return deck.name + " - " + deck.tier + "\n" +
        "Overview: " + deck.link + "\n\n" +
        deck.image;
}

function sendFormattedCard(msg, cardName) {
    let card = cardData[cardName];
    let getIdleUrl = "http://www.bagoum.com/getIdle/" + encodeURIComponent(card.name);
    request(getIdleUrl, function (err, resp, idleAnimationUrl) {
        if (err) {
            console.log(err);
            return;
        }
        if (resp.statusCode != 200) {
            console.log("Unexpected response code:", resp.statusCode);
            return;
        }
        var raceVal = "";
        if (card["race"] != "") {
            var racewords = card["race"].split(" ").map(x => {
                return x.substring(0, 1).toUpperCase() + x.substring(1).toLowerCase();
            });
            raceVal = ` (${racewords.join(" ")})`;
        }
        formattedText = card.name + ` -- ${card.shortfaction}\n` +
            card.type + raceVal + " -- " + card.expansion + "\n" +
            card.description + "\n";
        formattedText += card.manaCost + " mana";
        if (["Unit", "General"].indexOf(card.type) > -1) {
            formattedText += " " + card.attack + "/" + card.health;
        }
        formattedText += "\n\nhttp://" + idleAnimationUrl;
        sendMessage(msg.channel, formattedText);
    });
}

function outputCards(msg, cardNames) {
    if (cardNames.length == 1) {
        sendFormattedCard(msg, cardNames[0]);
    } else if (cardNames.length > 1 && cardNames.length <= 32) {
        sendMessage(
            msg.channel,
            "Cards that match your query: " +
            cardNames.map(function (cardName) {
                return cardData[cardName].name;
            }).join(", ")
        );
    } else if (cardNames.length > 32) {
        sendMessage(
            msg.channel,
            "Found " + cardNames.length + " matches, please limit " +
            "your query."
        );
    } else {
        sendMessage(
            msg.channel,
            "Sorry, but I can't find a card with those parameters."
        );
    }
}

function doesTermMatchCard(term, cardName) {
    let card = cardData[cardName];
    for (var i = 0; i < card.searchableText.length; i++) {
        if (card.searchableText[i].includes(term)) {
            return true;
        }
    }
    return false
}

function splitSearchableText(searchableText) {
    let re = /([0-9a-z])([A-Z])|([a-z])([0-9])|([0-9])([a-z])/g;
    searchableText = searchableText.replace(re, '$1$3$5 $2$4$6');
    return searchableText.split(/[ .,]/).map(function (term) {
        return term.toLowerCase()
    });
}

function formatCardData(cards) {
    for (var cardName in cards) {
        if (!cards.hasOwnProperty(cardName)) {
            continue;
        }
        card = cards[cardName];
        card.searchableText = splitSearchableText(card.searchableText);
        card.name = cardName;
        cardData[cardName.toLowerCase()] = card
    }
}

function buildCardData(callback) {
    console.log("Building card storage...");
    request("http://bagoum.com/cardsFullJSON", function (err, resp, body) {
        if (err) {
            return callback(err);
        }
        if (resp.statusCode != 200) {
            return callback("Invalid status code: " + resp.statusCode);
        }
        var cards = JSON.parse(body);
        formatCardData(cards);
        return callback(null);
    });
}

function buildTierList(callback) {
    console.log("Building tierlist...");
    request("http://www.bagoum.com/info/tierlist.html", function (err, resp, body) {
        if (err) {
            return callback(err);
        }
        if (resp.statusCode != 200) {
            return callback("Invalid status code: " + resp.statusCode);
        }
        var $ = cheerio.load(body);
        var tiers = get_tiers_from_page($);
        var decks = [];
        for (var i = 0; i < tiers.length; i++) {
            var tier = tiers[i];
            for (var j = 0; j < tier.decks.length; j++) {
                let cheerio_deck = tier.decks[j];
                decks.push(cheerio_deck_to_deck_object(cheerio_deck, tier));
            }
        }
        tierlistData = decks;
        return callback(null);
    });
}

function get_tiers_from_page($) {
    var tiers = $('h2');
    tiers = tiers.map(function (i, el) {
        var decks = [];
        var deck = $(this).next();
        while (deck.length && deck[0].attribs && deck[0].attribs.class === "deck") {
            decks.push(deck);
            deck = deck.next();
        }
        var tier = $(this).text();
        //Strip first part
        tier = tier.match(/TIER.*/)[0];
        return {
            name: tier,
            decks: decks
        }
    }).toArray();
    return tiers;
}

function cheerio_deck_to_deck_object(deck, tier) {
    var name = deck.find('.deckname').text();
    // Strip Number
    name = name.match(/\. (.*)/)[1];
    var featuredImg = "http://www.bagoum.com" + deck.find('img').attr('src');
    var linkToArchetype = "http://www.bagoum.com/tierlist.html#" + deck.attr('id');
    var terms = name.split(/[\s\/.,]/).map((term) => {
        return term.toLowerCase();
    });
    return {
        name: name,
        terms: terms,
        image: featuredImg,
        link: linkToArchetype,
        tier: tier.name
    };
}

function initializeData(callback) {
    console.log("Initializing all data...");
    buildCardData(function (err) {
        if (err) {
            return callback(err);
        }
        buildTierList(callback);
    });
}

initializeData((err) => {
    if (err) {
        return console.log(err);
    }
    bot.login(loginToken)
});
