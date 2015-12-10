var express = require('express');
var pool = require('./db');
var chalk = require('chalk');
var _ = require('lodash');
var logger = require('./log');

var router = express.Router();              // get an instance of the express Router

var LOWER_CAP = 200;
var UPPER_CAP = 750;
var NEW_PLAYER = 200;


/**
 * ----------------------------------------------------------
 * generate player object for response
 * ----------------------------------------------------------
 * @param player
 * @param defaults
 * @returns {{steamid: *, ctf: {elo: number, games: (number|*)}}}
 */
function generatePlayerObject(player, defaults) {
    return {
        steamid: player.player_id   || defaults.player_id,
        ctf: {
            elo: player.rank        || defaults.rank,
            games: player.num_games || defaults.num_games
        }
    };
}


/**
 * ----------------------------------------------------------
 * Applying lower and upper cap
 * ----------------------------------------------------------
 * @param players
 */
function applyCap(players) {

    _.each(players, function (player) {

        if (player.ctf.elo < LOWER_CAP) {
            player.ctf.elo = LOWER_CAP;
        }

        if (player.ctf.elo > UPPER_CAP) {
            player.ctf.elo = UPPER_CAP;
        }
    });
}


/**
 * ----------------------------------------------------------
 * ELO HANDLER
 * ----------------------------------------------------------
 */
router.get('/omega/elo/:ids', function (req, res) {

    logger.logRequest(req);

    var players = [];
    var ids = req.params.ids.split('+');
    var IN = ids.join(',');

    pool.getConnection(function (err, connection) {
        // Use the connection
        connection.query("SELECT * FROM player_rank where player_id IN (?)", [IN], function (err, result) {

            var playerIndex = {};

            // generate response object
            _.each(result, function (player) {
                var p = generatePlayerObject(player);
                playerIndex[player.player_id] = true;
                players.push(p);
            });

            // apply cap
            applyCap(players);

            //deal with new players (non-existing steam id)
            _.each(ids, function (id) {
                if (typeof playerIndex[id] === 'undefined') {
                    var p = generatePlayerObject('', {
                        player_id: id,
                        num_games: 0,
                        rank: NEW_PLAYER
                    });
                    players.push(p);
                }
            });

            res.setHeader('Content-Type', 'application/json');
            res.send({players: players});
            connection.release();
        });
    });
});

module.exports = router;