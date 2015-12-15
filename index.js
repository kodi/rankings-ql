var glob    = require("glob");
var _       = require("lodash");
var fs      = require("fs");
var Q = require('q');
var chalk = require('chalk');
var mysql      = require('mysql');

var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : '',
    database : 'ratings_test'
});


var HOST = '46.101.230.5';
var PORT = '27960';

var GAME_REPORT_FIELDS = {
    ip : "serverIp",
    port : "serverPort",
    playerId : "STEAM_ID"
};


var PLAYERS  = [];
var eloValues = [];


glob("data/*.json",function (er, files) {
//glob("data/0b92e542-5edb-40bd-a4ce-bda997647a02.json",function (er, files) {

    var readPromises = files.map(function(file){
        return Q.nfcall(fs.readFile, file).then(function(data){
            var gameModel = JSON.parse(data);
            //if (gameModel[GAME_REPORT_FIELDS.ip] === HOST && gameModel[GAME_REPORT_FIELDS.port] === PORT) {
                //console.log(gameModel[GAME_REPORT_FIELDS.ip]);

                if(gameModel.playerStats.length > 4) {
                    parseServer(gameModel);

                }

            //}
        }).fail(function(err){
            console.log(err);
        });

    });


    Q.allSettled(readPromises).then(function(data){
        console.log('ALL DONE');

        console.log('[ TOP ] -------------------------------');
        var data = _.sortByOrder(PLAYERS, ['elo'],['desc']);

        _.slice(data, 0, 20).filter(function(p){
            //console.log(p);
            console.log("elo:" + p.elo +"\tnum_games:"+ p.numGames  + "\t" + p.name  );
        });

        console.log('[ BOTTOM ] -------------------------------');
        var dataAsc = _.sortByOrder(PLAYERS, ['elo'],['asc']);

        _.slice(dataAsc, 0, 20).filter(function(p){
            //console.log(p);
            console.log("elo:" + p.elo +"\tnum_games:"+ p.numGames  + "\t" + p.name  );
        });
    })
});


function getPlayerAvgValue(players, val){

    var avg = 0;
    var i = 0;
    if (val === 'dmg') {

        _.each(players, function(player){
            var dmg = parseInt(player.DAMAGE.DEALT);
            avg += dmg;

            i++;
        });

    }

    return avg / i;
}


function getPlayerMaxValue(players, val){

    var max = Number.NEGATIVE_INFINITY;
    var i = 0;
    if (val === 'dmg') {

        _.each(players, function(player){
            var dmg = parseInt(player.DAMAGE.DEALT);
            if (dmg > max ) {
                max = dmg;
            }
        });

    }

    return max;
}
function parseServer(gameModel) {

    //console.log(gameModel[GAME_REPORT_FIELDS.ip]);

    var averageDamage = getPlayerAvgValue(gameModel.playerStats, 'dmg');
    var maxDamage = getPlayerMaxValue(gameModel.playerStats, 'dmg');

    var maxDiff = maxDamage - averageDamage;

    var TEAM_STATS = {
        TEAM_1 : [],
        TEAM_2 : []

    };

    var CALC = {
        TEAM_1_CALC : {},
        TEAM_2_CALC : {}
    };

    _.each(gameModel.playerStats, function(player){

        var playerId = player[GAME_REPORT_FIELDS.playerId];
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



        var pl = _.where(PLAYERS, {id: playerId});

        if (pl.length === 0) {
            addPlayer(playerId, nick);
        }
    });

    var i = 0;
    var _dmgG = 0;
    var _dmgT = 0;

    _.each(TEAM_STATS.TEAM_1, function(player){
        _dmgG += player.dmg;
        _dmgT += player.dmgTaken;

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


        CALC.TEAM_2_CALC = {
            dmgTotalGiven : _dmgG,
            dmgTotalTaken : _dmgT,
            dmg : _dmgG / i,
            dmgTaken : _dmgT / i
        };
    });



    var matchGuid = gameModel.matchStats.MATCH_GUID;
    var matchTimestamp = gameModel.gameEndTimestamp;

    _.each(gameModel.playerStats, function(player){
        //console.log(player.TEAM, player.STEAM_ID);

        //(avgEmyElo/1000)*(total time/actual time played)*(5xcap + 3xassist + defend + (dmg/1000))

        var nick = player['NAME'];
        var playTime = player['PLAY_TIME'];
        var cap = parseInt(player.MEDALS.CAPTURES);
        var assist = parseInt(player.MEDALS.ASSISTS);
        var defend = parseInt(player.MEDALS.DEFENDS);
        var dmg = parseInt(player.DAMAGE.DEALT);
        var dmgTaken = parseInt(player.DAMAGE.TAKEN);
        var playerId = player[GAME_REPORT_FIELDS.playerId];
        var score = parseInt(player.SCORE);
        var win = parseInt(player.WIN);
        var team = parseInt(player.TEAM);

        var enemyTeam = 1;
        if (team === 1) {
            enemyTeam = 2;
        }

        var totalTeamDamage = CALC['TEAM_' + team + "_CALC"].dmgTotalGiven;
        var totalEnemyTeamTakenDamage =  CALC['TEAM_' + enemyTeam + "_CALC"].dmgTotalTaken;
        var adjustedDamage = dmg - (dmg/totalTeamDamage) * (totalTeamDamage - totalEnemyTeamTakenDamage);

        //if(matchGuid === '00020b7b-963c-40be-82a1-323ce91dddd9' && nick === 'Silencep'){
        //    console.log("AAA::: ",dmg, totalTeamDamage, totalEnemyTeamTakenDamage, adjustedDamage);
        //
        //    process.exit(1);
        //}

        var pl = _.where(PLAYERS, {id: playerId});

        if (dmg === 0) {
            dmg = 1;
        }
        var avgDmgDiff = dmg - averageDamage;

        //console.log(playerId, nick, playTime);
        //console.log(maxDiff / avgDmgDiff);
        var elo =  (0.25 * (1) * ((5 * cap) + (3 * assist) + (1 * defend) + 55 * (avgDmgDiff/ maxDiff )));
        //var elo =  (1) * (1 * (1) * ((1 * cap) + (10 * assist) + (4 * defend) + (dmg/3000)));
        var eloInt = parseInt(elo);


        //do once
        insertPlayerData({
            damageGiven : dmg,
            damageTaken : dmgTaken,
            score : score,
            time: playTime,
            win: win,
            playerId : playerId,
            gameID : matchGuid,
            date: matchTimestamp,
            nick: nick,
            adjustedDamage : adjustedDamage
        });

        pl = pl[0];
        //console.log(pl);
        var oldElo = pl.elo;
        var newElo = oldElo + eloInt;
        updatePlayer(playerId, newElo);

        eloValues.push(eloInt);
        console.log("max", _.max(eloValues));
        console.log("min", _.min(eloValues));
    });



}

function insertPlayerData(data){
    console.log(data);
    connection.query('INSERT INTO `qlstats_matches` (`damage_given`, `damage_taken`,`score`,`time`,`win`, `player_id`, `game_id`, `date`,`nick`, `damage_given_adjusted`) values(?,?,?,?,?,?,?,?,?,?)',
        [data.damageGiven, data.damageTaken, data.score, data.time, data.win, data.playerId, data.gameID, data.date, data.nick, data.adjustedDamage],
        function(err, results) {

            //console.log(chalk.white('Inserted player '), chalk.green(data.nick), " for game: ", chalk.red(data.gameID));
    });
}

function updatePlayer(playerId, elo) {
    var player = _.where(PLAYERS, {id:playerId});
    player[0].elo = elo;
    player[0].numGames += 1;

}

function addPlayer(playerId, name) {
    //console.log("adding player",playerId, name);
    PLAYERS.push( {
        name: name,
        id: playerId,
        elo : 0,
        numGames:0
    });
}