var express = require('express');
var pool = require('./db');
var chalk = require('chalk');
var _ = require('lodash');
var logger = require('./log');

var moment = require('moment');

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

router.get('/omega/seen/:id', function (req, res) {

    var ids = req.params.id;

    pool.getConnection(function (err, connection) {

        // Use the connection


        var QUERY = 'select `date`, `game_id`,`nick` from `qlstats_matches_details` ';
        QUERY += 'WHERE `player_id` = ? ';

        QUERY += 'ORDER BY `date` DESC ';
        QUERY += 'LIMIT 0,1';


        connection.query(QUERY, [ids], function (err, result) {

            if (! err) {
                var start = moment.unix(result[0].date);
                var end = moment();
                var diff = moment.duration(end - start).humanize();

                var out = {};
                out.gid = result[0].game_id;
                out.last_game_relative = diff;
                out.last_nick = result[0].nick;
                out.last_game_end_timestamp = result[0].date;

                res.send({data: out});
            }

            connection.release();

        });
    });
});


module.exports = router;