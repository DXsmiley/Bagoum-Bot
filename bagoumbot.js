var Discord = require("discord.js");
var request = require("request");

var bot = new Discord.Client();

var loginToken = process.env.DISC_TOKEN;
var prefix = "$";
var card_data = {}

bot.on("message", msg => {
    if (msg.content.startsWith(prefix) &&
        msg.content.length > 1 && !msg.author.bot) {
        let args = msg.content.substring(1).split(" ");
        let command = args[0];
        console.log("Executing:", msg.content);
        if (command == "echo") {
            msg.channel.sendMessage(args.slice(1).join(" "));
        } else if (command == "card-name") {
            let subname = args.slice(1).join(" ").toLowerCase();
            let card_names = Object.keys(card_data).filter(function(name) {
                return name.includes(subname);
            });
            output_cards(msg, card_names);
        } else if (command == "card-search") {
            let card_names = Object.keys(card_data);
            for (var i = 1; i < args.length; i++) {
                let term = args[i].toLowerCase();
                card_names = card_names.filter(function(card_name) {
                    return does_term_match_card(term, card_name);
                });
            }
            output_cards(msg, card_names);
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

function send_formatted_card(msg, card_name) {
    let card = card_data[card_name];
    let get_idle_url = "http://www.bagoum.com/getIdle/" + encodeURIComponent(card_name);
    request(get_idle_url, function(err, resp, idle_animation_url) {
        if (err) {
            console.log(err);
            return;
        }
        if (resp.statusCode != 200) {
            console.log("Unexpected response code:", resp.statusCode);
            return;
        }
        formatted_text = card.name + "   " + card.manaCost + "\n" + 
            card.shortfaction + " " + card.type + " - " + card.expansion + "\n" +  
            card.description + "\n";
        if (card.type === "Unit") {
            formatted_text += card.attack + "/" + card.health + "\n";
        }
        formatted_text += idle_animation_url;
        msg.channel.sendMessage(formatted_text);
    });
}

function output_cards(msg, card_names) {
    if (card_names.length == 1) {
        send_formatted_card(msg, card_names[0]);
    } else if (card_names.length > 1) {
        msg.channel.sendMessage(
            "Too many matches found, pm'ing you the names that matched your query"
        );
        msg.author.sendMessage(
            card_names.join(", ")
        );
    } else {
        msg.channel.sendMessage(
            "Sorry, but I can't find a card with those parameters."
        );
    }
}

function does_term_match_card(term, card_name) {
    let card = card_data[card_name];
    return card.searchableText.indexOf(term) > -1;
}

function split_searchable_text(searchable_text) {
    let re = /([0-9a-z])([A-Z])|([a-z])([0-9])|([0-9])([a-z])/g;
    searchable_text = searchable_text.replace(re, '$1$3$5 $2$4$6');
    return searchable_text.split(/[ .,]/).map(function(term) {
        return term.toLowerCase()
    });
};

function build_card_data(cards) {
    for (var card_name in cards) {
        if (!cards.hasOwnProperty(card_name)) {
            continue;
        }
        card = cards[card_name];
        card.searchableText = split_searchable_text(card.searchableText);
        card.name = card_name;
        card_data[card_name.toLowerCase()] = card
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
    build_card_data(cards);
    bot.login(loginToken);
});
