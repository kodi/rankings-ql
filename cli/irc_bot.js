var irc = require("irc");
var LOG = require('../app/log');
var request = require('request');
var Q = require('q');
//---------------------------------------------------------- local
var CONFIG = require('../config/config');


/**
 * @namespace IRC_CONFIG
 */
var IRC_CONFIG = {
    channels: [
        '#gibstars'
        ,'#omega123'
    ],
    server: "se.quakenet.org",
    botName: "[omega-bot]"
};


var API_URL = 'http://quake.land:4444/api/omega';

/**;
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 * @param options
 * @param {CONFIG} options.CONFIG
 * @param {IRC_CONFIG} options.IRC_CONFIG
 * @constructor
 */
var IrcBot = function(options){
    this.options = options;

    this.bot = null;
};

/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 */
IrcBot.prototype.connect = function(){

    this.bot = new irc.Client(this.options.IRC_CONFIG.server, this.options.IRC_CONFIG.botName, {
        channels: this.options.IRC_CONFIG.channels
    });

    this.addListeners();

};



IrcBot.prototype.getRecipient = function (from, to, text, message) {
    var pm = false;
    var rcpt = to;

    if (to === this.bot.nick) {
        pm = true;
    }
    if (pm === true) {
        rcpt = from;
    }
    return rcpt;
};

IrcBot.prototype.getMessage = function (from, to, text, message, cb) {

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

            this.getElo(cb, arg, from);
            return;

        case '!seen':
            this.getSeen(cb, arg, from);
            return;

        default:
            cb('');

    }

};

IrcBot.prototype.getElo = function(cb, arg, from){



    if (arg !== null){
        var steamId = arg;
    } else {
        cb('no steam id provided');
        return;
    }

    var url = API_URL + '/elo/' + steamId;

    request({url: url, gzip: false, json: true, encoding: 'utf8'},
        function (error, response, body) {
            LOG.logInfo(body);
            var elo = body.players[0].ctf.elo;
            var num_games = body.players[0].ctf.games;
            var elo_change = body.players[0].ctf.elo_change;

            var msg = irc.colors.wrap('gray','ELO: ');
            msg += irc.colors.wrap('dark_green',elo);
            msg += irc.colors.wrap('light_green','(' + elo_change + ')');
            msg += irc.colors.wrap('gray',' [' + num_games + ' games]');
            cb(msg);

        }
    );

};


IrcBot.prototype.getSeen = function(cb, arg, from){

    if (arg !== null){
        var steamId = arg;
    } else {
        cb('no steam id/nick provided');
        return;
    }

    var url = API_URL + '/seen/' + steamId;

    request({url: url, gzip: false, json: true, encoding: 'utf8'},
        function (error, response, body) {
            if ( body.data === 'error') {
                cb('no data found');
            } else {
                var seenTime = body.data.last_game_relative;
                var seenNick = body.data.last_nick;

                var msg = irc.colors.wrap('gray', 'last seen as ');
                msg += irc.colors.wrap('dark_green', seenNick);
                msg += irc.colors.wrap('light_green', ' (' + seenTime + ' ago)');
                cb(msg);
            }
        }
    );

};


IrcBot.prototype.addListeners = function(){

    var self = this;

    this.bot.addListener("message", function (from, to, text, message) {

        var msgTo = self.getRecipient(from, to, text, message);
        self.getMessage(from, to, text, message, function(msgText){
            LOG.logOk(message);
            LOG.logOk(msgText);
            if(msgText !== '' ){
                self.bot.say(msgTo, msgText);
            }
        });

    });


    this.bot.addListener("raw", function ( message) {
        LOG.logInfo(message);
    });


    //initial login
    this.bot.addListener("registered", function () {
        self.bot.say('Q@CServe.quakenet.org', 'AUTH omega-bot ' + self.options.CONFIG.irc.pass);
    });


};

/// ----------------------------------------------------------
/// START BOT
/// ----------------------------------------------------------


var ircBot = new IrcBot({
    CONFIG : CONFIG,
    IRC_CONFIG : IRC_CONFIG
});

ircBot.connect();


