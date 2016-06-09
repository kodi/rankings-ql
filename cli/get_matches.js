var glob = require("glob");
var _ = require("lodash");
var fs = require("fs");
var Q = require('q');
var chalk = require('chalk');
var mysql = require('mysql');
var util = require('util');
var moment = require('moment');

//----------------------------------------------------------
var MatchResultsModel = require('../lib/MatchResultsModel');
var QlstatsApi = require('../lib/QlstatsApi');
var Config = require('../config/config');
var LOG = require('../app/log');
var connection = mysql.createConnection(Config.db);
var LoopArray = require('../lib/arr_loop');

//----------------------------------------------------------

//step 1, read all files

var program = require('commander');

program.version('0.0.1')
    .option('-d, --date <s>', 'Do update for specific date')
    .parse(process.argv);

var date = moment().format('YYYY-MM-DD');
if (program.date) {
    date = program.date;
    console.log('Overriding date to ' + date);
}
process.exit();
//var date = '2016-01-17';
LOG.logOk("Getting the games for date: " + date);
var api = new QlstatsApi();
api.getAllData(date, function (data) {


    var model = new MatchResultsModel();

    //var slice = _.slice(data.files, 1153 + 1026 + 700 + 1000, data.files.length);
    var allGames = data.files;
    var l = allGames.length;

    if (l > 0) {

        LoopArray(allGames, {
            iter: function (file, index) {

                LOG.logOk('Processing ' + (index + 1 ) + '/' + l);


                connection.query("SELECT *  FROM `matches` where game_id = ? ", [file], function (err, results) {

                    if (results.length > 0) {
                        LOG.logOk('Game ' + file + ' already in DB');
                        if ((index + 1) >= l) {
                            connection.end()
                        }
                    } else {

                        model = new MatchResultsModel();
                        model.loadRemote(date, file)
                            .then(function () {
                                return getRealmServerId(model, connection);
                            })
                            .then(function (serverData) {
                                return processAcceptedMatch(model, serverData, connection);
                            }, function (err) {
                                LOG.logErr(err)
                            })
                            .then(function () {
                                if ((index + 1) >= l) {
                                    connection.end();
                                }
                            });
                    }
                });

            }, end: function () {

            }
        }, 500, false);
    } else {
        LOG.logErr('NO GAMES YET!');
    }
});


function processAcceptedMatch(model, serverData, dbConnection) {
    var df = Q.defer();
    getMatchDBStatus(model, dbConnection)
        .then(function(status){
            return insertPlayerDetails(model, serverData, status, dbConnection);

        }, function(err) { LOG.logErr(err); df.resolve(); })
        .then(function(data){
                LOG.logOk(data);
                df.resolve();
        }, function(err) {
            LOG.logErr(err);
            df.resolve(err);
        });


    return df.promise;

}

function insertPlayerDetails(model, serverData, status, dbConn) {

    var df = Q.defer();

    if( status !== true){
        df.reject('Game Already in DB');
    } else {

        var CALC = model.getSummaryDamages();

        var matchGuid = model.getGuid();
        var matchTimestamp = model._data.gameEndTimestamp;

        var insertPromises = [];

        _.each(model._data.playerStats, function(player){
            var playerDetails = extractPlayerDetails(player);
            var totalTeamDamage = CALC['TEAM_' + playerDetails.team + "_CALC"].dmgTotalGiven;
            var totalEnemyTeamTakenDamage =  CALC['TEAM_' + playerDetails.enemyTeam + "_CALC"].dmgTotalTaken;

            playerDetails.adjustedDamage= playerDetails.dmg - (playerDetails.dmg/totalTeamDamage) * (totalTeamDamage - totalEnemyTeamTakenDamage);
            playerDetails.gameID = matchGuid;
            playerDetails.date = matchTimestamp;

            insertPromises.push(insertPlayerData(playerDetails, dbConn));

        });

        Q.allSettled(insertPromises).then(function(){
            dbConn.query("INSERT INTO `matches` (`game_id`, `processed`, `server_id`) VALUES (?, ?, ?)", [matchGuid, 1, serverData.id], function(err, data){

                if( err) {
                    LOG.logErr(err);
                    df.reject('error while inserting match');
                } else {
                    df.resolve('Successfully inserted game ' + matchGuid);
                }

            });
        });
    }

    return df.promise;

}
/**
 *
 * @param {PlayerDetails} data
 * @param {mysql.connection} dbConnection
 * @returns {*|promise}
 */
function insertPlayerData(data, dbConnection) {

    var df = Q.defer();

    dbConnection.query('INSERT INTO `qlstats_matches_details` (`damage_given`, `damage_taken`,`score`,`time`,`win`, `player_id`, `game_id`, `date`,`nick`, `damage_given_adjusted`,`cap`,`assist`,`defend`) values(?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [data.dmg, data.dmgTaken, data.score, data.playTime, data.win, data.playerId, data.gameID, data.date, data.nick, data.adjustedDamage, data.cap, data.assist, data.defend],
        function(err, results) {
            if (! err) {
                df.resolve();
            } else {
                LOG.logErr(err);
                df.reject(err);
            }
        });

    return df.promise;
}

/**
 *
 * @param player
 * @returns {PlayerDetails}
 */
function extractPlayerDetails(player) {

    var _enemyTeam = 1;
    if (parseInt(player.TEAM) === 1) {
        _enemyTeam = 2;
    }

    /**
     * @namespace PlayerDetails
     */
    var pd = {
        nick : player['NAME'],
        playTime : player['PLAY_TIME'],
        cap : parseInt(player.MEDALS.CAPTURES),
        assist : parseInt(player.MEDALS.ASSISTS),
        defend : parseInt(player.MEDALS.DEFENDS),
        dmg : parseInt(player.DAMAGE.DEALT),
        dmgTaken : parseInt(player.DAMAGE.TAKEN),
        playerId : player["STEAM_ID"],
        score : parseInt(player.SCORE),
        win : parseInt(player.WIN),
        team : parseInt(player.TEAM),
        enemyTeam :  _enemyTeam
    };

    return pd;
}

/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 * @param model
 * @param dbConn
 * @returns {*|promise}
 */
function getMatchDBStatus(model, dbConn){

    var guid = model.getGuid();

    var df = Q.defer();

    dbConn.query("SELECT * FROM `matches` WHERE game_id = ? AND PROCESSED = 1", [guid], function(err, data){

        if( err ) {
            df.reject(err);
        }

        if (data.length > 0) {
            df.resolve(false);
        } else {
            df.resolve(true);
        }

    });

    return df.promise;
}


/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 * @param {MatchResultsModel} model
 * @param {mysql.connection} dbConnection
 * @returns {*|promise}
 */
function getRealmServerId(model, dbConnection) {

    var df = Q.defer();



    getServerId(model, dbConnection).then(function (serverData) {

        if (typeof serverData.id !== "undefined") {

            df.resolve(serverData);

        } else {

            df.reject('Server ip/port not in accepted realm | '+ model.getGuid(), model.getGuid);
        }
    });

    return df.promise;
}


/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 * @param {MatchResultsModel} model
 * @param {mysql.connection} dbConnection
 */
function getServerId(model, dbConnection) {
    var host = model.getServerIp();
    var port = model.getServerPort();

    var df = Q.defer();

    dbConnection.query("SELECT * FROM `servers` WHERE `server_ip`=? AND `server_port` = ? ", [host, port], function (err, serverData) {

        if (serverData.length > 0) {
            df.resolve(serverData[0]);
        } else {
            df.resolve([]);
        }
    });

    return df.promise;

}


