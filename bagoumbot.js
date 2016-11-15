var cheerio = require("cheerio");
var Discord = require("discord.js");
var request = require("request");

var bot = new Discord.Client();

var loginToken = process.env.DISC_TOKEN;
var prefix = "$";
var cardData = {};
var tierlistData = [];

bot.on("message", msg => {
    if (msg.content.startsWith(prefix) &&
        msg.content.length > 1 && !msg.author.bot) {
        try {
            let args = msg.content.substring(1).split(" ");
            let command = args[0];
            console.log("Executing:", msg.content);
            if (["card-name", "name"].indexOf(command) > -1) {
                cardNameCommand(args, msg);
            } else if (["card-search", "card"].indexOf(command) > -1) {
                cardSearchCommand(args, msg);
            } else if (["tierlist", "tl"].indexOf(command) > -1) {
                tierlistCommand(args, msg);
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
    member.guild.defaultChannel.sendMessage(`Welcome, ${member.user.username}!`)
});

bot.on("disconnected", () => {
    bot.login(loginToken);
});

function sendMessage(channel, message) {
    channel.sendMessage(message);
};

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

function tierlistCommand(args, msg) {
    let decks = tierlistData;
    for (var i = 1; i < args.length; i++) {
        let term = args[i].toLowerCase();
        decks = decks.filter(function(deck) {
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
};

function formatDeck(deck) {
    return deck.name + " - " + deck.tier + "\n" +
        "Overview: " + deck.link + "\n" + 
        deck.image;
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
        sendMessage(msg.channel, formattedText);
    });
};

function outputCards(msg, cardNames) {
    if (cardNames.length == 1) {
        sendFormattedCard(msg, cardNames[0]);
    } else if (cardNames.length > 1) {
        sendMessage(
            msg.channel,
            "Too many matches found, pm'ing you the names that matched your query"
        );
        msg.author.sendMessage(
            cardNames.map(function(cardName) {
                return cardData[cardName].name;
            }).join(", ")
        );
    } else {
        sendMessage(
            msg.channel,
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
};

function buildCardData(callback) {
    console.log("Building card storage...");
    request("http://bagoum.com/cardsFullJSON", function(err, resp, body) {
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
};

function buildTierList(callback) {
    console.log("Building tierlist...");
    request("http://www.bagoum.com/info/tierlist.html", function(err, resp, body) {
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
};

function get_tiers_from_page($) {
    var tiers = $('h2');
    tiers = tiers.map(function(i, el) {
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
};

function cheerio_deck_to_deck_object(deck, tier) {
    var name = deck.find('.deckname').text();
    // Strip Number
    name = name.match(/\. (.*)/)[1];
    var featuredImg = "http://www.bagoum.com/" + deck.find('img').attr('src');
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
};

function initializeData(callback) {
    console.log("Initializing all data...");
    buildCardData(function(err) {
        if (err) {
            return callback(err); 
        }
        buildTierList(callback);
    });
};

initializeData((err) => {
    if (err) {
        return console.log(err);
    }
    bot.login(loginToken)
});
