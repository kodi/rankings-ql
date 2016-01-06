var irc = require("irc");
var LOG = require('../app/log');
var request = require('request');

var config = {
    channels: ['#gibstars'],
    server: "se.quakenet.org",
    botName: "[omega-bot]"
};


var API_URL = 'http://quake.land:4444/api/omega';

var bot = new irc.Client(config.server, config.botName, {
    channels: config.channels
});

var getReiepient = function (from, to, text, message) {
    var pm = false;
    var rcpt = to;

    if (to === bot.nick) {
        pm = true;
    }
    if (pm === true) {
        rcpt = from;
    }
    return rcpt;
};

var getMessage = function (from, to, text, message, cb) {

    var arg = null;
    if (text.charAt(0) === '!'){
        var parts = text.split(' ');
        var cmd = parts[0];
        if( parts.length > 1){
            arg = parts[1];
        }
    } else {
        cb('');
    }

    switch (cmd) {

        case '!elo':

            getElo(cb, arg, from);
            return;

        default:
            cb('');

    }

};

var getElo = function(cb, arg, from){

    var IDS = {
        'kodisha' : '76561198010942011'
    }

    if (arg !== null){
        var steamId = arg;
    } else {

        steamId = IDS[from];

    }



    var url = API_URL + '/elo/' + steamId;

    request({url: url, gzip: false, json: true, encoding: 'utf8'},
        function (error, response, body) {
            var elo = body.players[0].ctf.elo;
            var num_games = body.players[0].ctf.games;
            var elo_change = body.players[0].ctf.elo_change;

            var msg = irc.colors.wrap('gray','ELO: ');
            msg += irc.colors.wrap('dark_green',elo_change);
            msg += irc.colors.wrap('light_green','(' + elo_change + ')');
            msg += irc.colors.wrap('gray',' [' + num_games + ' games]');
            cb(msg);

        }
    );

};

bot.addListener("message", function (from, to, text, message) {

    var msgTo = getReiepient(from, to, text, message);
    getMessage(from, to, text, message, function(msgText){
        LOG.logOk(message);
        LOG.logOk(msgText);
        if(msgText !== '' ){
            bot.say(msgTo, msgText);
        }
    });

});


bot.addListener("raw", function ( message) {
    LOG.logInfo(message);
});


bot.addListener("registered", function ( message) {
    bot.say('Q@CServe.quakenet.org', 'AUTH omega-bot yJT9bFirKt');
});