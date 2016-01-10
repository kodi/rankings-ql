var irc = require("irc");
var LOG = require('../app/log');
var request = require('request');
var pool = require('../app/db');
var Q = require('q');
var _ = require('lodash');
//---------------------------------------------------------- local
var CONFIG = require('../config/config');


/**
 * @namespace IRC_CONFIG
 */
var IRC_CONFIG = {
    channels: ['#gibstars'
        ,'#omega123'
        ,'#omega'],
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

    this.IRC_NICKS = null;
};

IrcBot.prototype.getIrcNicks = function(){

    var df = Q.defer();

    var self = this;


    pool.getConnection(function (err, connection) {

        connection.query("SELECT * from `players` ", function(err, data){

            if (!err) {
                self.IRC_NICKS = {};
                self.IRC_IDS = {};
                _.each(data, function(row){
                    self.IRC_NICKS[row.irc_nick] = row.player_id;
                    self.IRC_IDS[row.player_id] = row.irc_nick;
                });

                df.resolve(self.IRC_NICKS);
            } else {
                df.reject('cannot get players');
            }

        });

    });


    return df.promise;

};

/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 */
IrcBot.prototype.connect = function(){
    var self = this;

    this.getIrcNicks()
        .then(function(players){

            LOG.logInfo('got players');
            LOG.logOk(players);

            self.bot = new irc.Client(self.options.IRC_CONFIG.server, self.options.IRC_CONFIG.botName, {
                channels: self.options.IRC_CONFIG.channels
            });

            self.addListeners();

        }, function(err){
            LOG.logErr(err);
        });



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

        case '!rating':
            this.getElo(cb, arg, from);
            return;

        case '!seen':
            this.getSeen(cb, arg.trim(), from);
            return;

        case '!iam':
            this.getIam(cb, arg.trim(), from);
            return;


        default:
            cb('');

    }

};


IrcBot.prototype.getIam = function(cb, arg, from){
    var self = this;
    if (arg !== null){
        var steamId = arg.trim();
    } else {
        cb('please provide steam id');
        return;
    }


    pool.getConnection(function (err, connection) {


        LOG.logOk('setting steam id ' + steamId);

        connection.query('INSERT INTO `players` (`player_id`,`irc_nick`) VALUES(?, ?)', [steamId, from], function(err, data){
            LOG.logErr(err);
            LOG.logOk(data);

            if (!err) {
               self.getIrcNicks()
                   .then(function(){
                       cb( from +' is now mapped to ' + steamId);
                   });

            } else {
                cb('IRC username or SteamID already in database');
            }

            connection.release();

        });


    });

};

IrcBot.prototype.getElo = function(cb, arg, from){

    var steamId;
    var nick;

    if (arg === null){

        steamId = this.getSteamIdFromIdOrNick(from);
        nick = from;

        if (steamId === null){
            cb('you must do !iam <steam64ID> first');
            return;
        }
    } else {
        steamId = this.getSteamIdFromIdOrNick(arg);
        nick = arg;
        if (steamId === null){
            cb('unknown player, he must do !iam <steam64ID> first');
            return;
        }
    }




    var url = API_URL + '/elo/' + steamId;

    request({url: url, gzip: false, json: true, encoding: 'utf8'},
        function (error, response, body) {
            LOG.logInfo(body);
            var elo = body.players[0].ctf.elo;
            var num_games = body.players[0].ctf.games;
            var elo_change = body.players[0].ctf.elo_change;
            if (elo_change > 0) {
                elo_change = '+' + elo_change;
            }

            var msg = irc.colors.wrap('gray', nick + ': ');
            msg += irc.colors.wrap('dark_green',elo);
            msg += irc.colors.wrap('light_green','(' + elo_change + ')');
            msg += irc.colors.wrap('gray',' [' + num_games + ' games]');
            cb(msg);

        }
    );

};


IrcBot.prototype.cleanNick = function(nick) {

        return nick.split(new RegExp('[(^1),(^2),(^3),(^4),(^5),(^6),(^7),(^8),(^9),]', 'g')).join('');

};

IrcBot.prototype.getSteamIdFromIdOrNick = function(id) {

    if (id === null) {
        return id;
    } else {
        var match = id.match(/^[0-9]{17}$/);
        if (match === null){
            if(typeof this.IRC_NICKS[id] === 'undefined'){

                return null;
            } else {
                return this.IRC_NICKS[id];
            }
        } else {
            return id;
        }
    }

};

IrcBot.prototype.getSeen = function(cb, arg, from){

    var self = this;
    var steamId = this.getSteamIdFromIdOrNick(arg);

    if(arg === null) {
        cb('player id or nick not provided');
        return;
    }
    if (steamId === null){
        cb('unknown player, he must do !iam <steam64ID> first');
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
                var gid = body.data.gid;

                var message = irc.colors.wrap('gray', 'last seen as: ');
                message += irc.colors.wrap('dark_green', self.cleanNick(seenNick));
                message += irc.colors.wrap('light_green', ' (' + seenTime + ' ago)');
                message += irc.colors.wrap('gray', ' [game details: http://qlstats.net:8080/game/' + gid + ' ]');
                cb(message);
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


