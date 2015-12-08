var express = require('express');
var pool = require('./db');
var chalk      = require('chalk');
var _          = require('lodash');

var router = express.Router();              // get an instance of the express Router

function generatePlayerObject(player, defaults){
    var p = {
        steamid : player.player_id || defaults.player_id,
        ctf :{
            elo : player.rank || defaults.rank,
            games : player.num_games || defaults.num_games
        }
    };

    return p;
}

function applyCap(players){

    //apply the cap
    _.each(players, function(player){

        if(player.ctf.elo < 250) {
            player.ctf.elo = 250;
        }

        if(player.ctf.elo > 750) {
            player.ctf.elo = 750;
        }
    });

}


function  niceLog(req){

    var message = "IP: " + chalk.red(req.ip);
    message += " (" +chalk.yellow(req.hostname) + ") ";
    message += chalk.blue(req.path);
    console.log(message);
}

router.get('/omega/elo/:ids', function(req, res) {
    niceLog(req);

    res.setHeader('Content-Type', 'application/json');

    var players = [];
    var ids = req.params.ids.split('+');
    var IN = ids.join(',');

    pool.getConnection(function(err, connection) {
        // Use the connection
        connection.query("SELECT * FROM player_rank where player_id IN (" + IN + ")", function(err, result) {

            var playerIndex = {};
            _.each(result, function(player){
                var p = generatePlayerObject(player);
                playerIndex[player.player_id] = true;
                players.push(p);
            });

            applyCap(players);

            //new players
            _.each(ids, function(id){
                if(typeof playerIndex[id] === 'undefined'){
                    var p = generatePlayerObject('', {
                        player_id : id,
                        num_games: 0,
                        elo :250
                    });
                    players.push(p);
                }
            });

            res.send({players: players});
            connection.release();
        });
    });
});

module.exports = router;