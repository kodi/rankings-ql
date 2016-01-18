var _ = require("lodash");
var fs = require("fs");
var Q = require('q');
var chalk = require('chalk');
var mysql = require('mysql');
var M = require('mstring');
var prettyHrtime = require('pretty-hrtime');

var pool = require('./app/db');
var Config      = require('./config/config');


var RES = [];
var rating_promises = [];
var connection = mysql.createConnection(Config.db);

var PLAYER_Q = 'select count(id) as num_games, M.`player_id`, M.`nick` FROM `qlstats_matches_details` as M group by  M.`player_id`';

var firstQueryStart = process.hrtime();

connection.query(PLAYER_Q)
    .on('result', function (_playerResult) {


        var QUERY = `SELECT(
            ROUND (
                AVG (
                    ((damage_given_adjusted / damage_taken) *
                    ( score +(( damage_given_adjusted / 1000 ) * 50))) /
                    ( time / 1200) + win * 300
                )/ 2.35
            )
        ) AS rating FROM (

            SELECT * FROM qlstats_matches_details  AS T
            WHERE T.player_id = ${_playerResult.player_id}
            AND time > 600
            ORDER BY date DESC LIMIT 50
        ) AS tbl `;

        var deferred = Q.defer();

        connection.query(QUERY).on('result', function (_ratingResult) {

            //if (r.rating !== null && _playerResult.num_games >= 10){
            RES.push({
                rating: _ratingResult.rating,
                nick: _playerResult.nick,
                num_games: _playerResult.num_games,
                id: _playerResult.player_id
            });
            //}

        }).on('end', function () {
            deferred.resolve();
        });

        rating_promises.push(
            deferred.promise
        );


    })
    .on('end', function () {

        console.log("Get all players: " + chalk.blue(prettyHrtime(process.hrtime(firstQueryStart))));
        Q.allSettled(rating_promises).then(function () {

            console.log('ALL CALCULATION ENDED');

            var insertsTime = process.hrtime();
            var inserts = insertRatings(RES, connection);

            Q.allSettled(inserts).then(function(){

                console.log("ALL INSERTS ENDED: " + chalk.blue(prettyHrtime(process.hrtime(insertsTime))));


                console.log('RELEASING CONNECTION');
                connection.end();
            });

        });


    });


/**
 * ----------------------------------------------------------
 * ----------------------------------------------------------
 * @param RES
 * @param connection
 * @returns {Array}
 */
function insertRatings(RES, connection) {

    var allInsertPromises = [];

    _.each(RES, function (player) {

        var deferred = Q.defer();
        var rating = 0;

        if (player.rating !== null) {
            rating = player.rating;
        }

        var INSERT_Q = 'INSERT INTO `player_rank` (`rank`, `num_games`, `player_id`) VALUES (?, ?, ?)';
        var UPDATE_Q = 'UPDATE `player_rank` SET `rank`=?, `num_games`=?, `old_rank`=? WHERE `player_id`=? ';

        var query = INSERT_Q;
        var action = 'inserted';

        var extra = '';

        connection.query("SELECT * FROM `player_rank` WHERE `player_id`=?", [player.id], function(err,data){

            if(player.rating === null){
                player.rating = 0;
            }

            var VALUES = [rating, player.num_games, player.id];

            if (typeof  data[0] !== 'undefined') {
                query = UPDATE_Q;
                action = 'updated';
                extra = " (was: " + chalk.yellow(data[0].rank) + ") ";

                VALUES = [rating, player.num_games, data[0].rank, player.id];

            }

            if(action === 'inserted'  || ( action === 'updated' && data[0].rank != player.rating)) {
                //if rank changed or new player - update
                connection.query(query, VALUES)
                    .on('end', function () {
                        console.log(action + " rating " + chalk.green(player.rating) + extra + " for player: " + chalk.red(player.nick));
                        deferred.resolve();
                    });

            } else {
                //nothing changed, skip
                //console.log("no change for player: " + chalk.red(player.nick));
                deferred.resolve();
            }

        });



        allInsertPromises.push(deferred.promise);

    });

    return allInsertPromises;


}
