var request = require('request');
var Q       = require('q');
var _       = require('lodash');
/*

Usage
----------------------------------------------------------
 var MatchResultModel = require('../lib/MatchResultsModel');
 var model = new MatchResultModel();

 model.loadRemote('2015-12-10', '711d1c19-b59d-4291-a9c9-4ce196dbfacf', function(gameData){
    console.log(gameData);
 });
 ----------------------------------------------------------

 */


function MatchResultsModel(gameId) {

    //this._gameId = gameId;
    //this.API_URL = 'http://qlstats.net:8081/api/jsons/{d}/{j}.json';
    this.API_URL = 'http://backup.qlstats.net:8082/api/jsons/{d}/{j}.json';
    this._data = null;

    this.FIELDS = {
        "IP" : 'serverIp',
        "PORT": "serverPort",
        "MATCH_STATS" : 'matchStats',
        "GUID" : "MATCH_GUID"
    }
}

/**
 * ----------------------------------------------------------
 * @param data
 */

MatchResultsModel.prototype.loadJSON = function(data) {
    this._data = data;
};

/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 * @returns {*}
 */
MatchResultsModel.prototype.getServerIp = function() {
    return this._data[this.FIELDS.IP];
};

/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 * @returns {*}
 */
MatchResultsModel.prototype.getServerPort = function() {
    return this._data[this.FIELDS.PORT];
};


MatchResultsModel.prototype.getGuid = function(){
    return this._data[this.FIELDS.MATCH_STATS][this.FIELDS.GUID];
};

MatchResultsModel.prototype._loadRemote = function (date, gameId, callback) {

    var url = this.API_URL.replace('{d}', date).replace('{j}', gameId);
    var self = this;

    request({url: url, gzip: true, json: true, encoding: 'utf8'},
        function (error, response, body) {
            self._data = body;
            callback(body);
        }
    );
};

MatchResultsModel.prototype.loadRemote = function (date, gameId) {

    var df = Q.defer();

    this._loadRemote(date, gameId, function(data){

        df.resolve(data);
    });

    return df.promise;

};



MatchResultsModel.prototype.getSummaryDamages = function() {

    var TEAM_STATS = {
        TEAM_1 : [],
        TEAM_2 : []

    };

    var CALC = {
        TEAM_1_CALC : {},
        TEAM_2_CALC : {}
    };

    _.each(this._data.playerStats, function(player){

        var playerId = player['STEAM_ID'];
        var nick = player['NAME'];
        var dmg = parseInt(player.DAMAGE.DEALT);
        var team = parseInt(player.TEAM);
        var dmgTaken = parseInt(player.DAMAGE.TAKEN);

        var insert = {
            dmg : dmg,
            dmgTaken : dmgTaken
        };

        if (team == 1){
            TEAM_STATS.TEAM_1.push(insert);
        } else {
            TEAM_STATS.TEAM_2.push(insert);
        }

    });

    var i = 0;
    var _dmgG = 0;
    var _dmgT = 0;

    _.each(TEAM_STATS.TEAM_1, function(player){
        _dmgG += player.dmg;
        _dmgT += player.dmgTaken;

        i++;

        CALC.TEAM_1_CALC = {
            dmgTotalGiven : _dmgG,
            dmgTotalTaken : _dmgT,
            dmg : _dmgG / i,
            dmgTaken : _dmgT / i
        };

    });


    i = 0;
    _dmgG = 0;
    _dmgT = 0;

    _.each(TEAM_STATS.TEAM_2, function(player){
        _dmgG += player.dmg;
        _dmgT += player.dmgTaken;

        i++;
        CALC.TEAM_2_CALC = {
            dmgTotalGiven : _dmgG,
            dmgTotalTaken : _dmgT,
            dmg : _dmgG / i,
            dmgTaken : _dmgT / i
        };
    });


    return CALC;

};



module.exports = MatchResultsModel;

