var _       = require("lodash");
var fs      = require("fs");
var Q = require('q');
var chalk = require('chalk');
var mysql      = require('mysql');
var M = require('mstring')

var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : '',
    database : 'ratings_test'
});

var RES = [];
var rating_promises = [];

connection.query('select count(id) as num_games, M.`player_id`, M.`nick` FROM `qlstats_matches` as M group by  M.`player_id`')
    .on('result', function (p) {

        var QUERY = `SELECT(
                ROUND (
                    AVG (
                        ((damage_given_adjusted / damage_taken) *
                        ( score +(( damage_given_adjusted / 1000 ) * 50))) /
                        ( time / 1200) + win * 300
                    )/ 2.35
                )
            ) AS rating FROM (

                SELECT * FROM qlstats_matches  AS T
            WHERE T.player_id = '${p.player_id}'
            AND
                time > 600
            ORDER BY date DESC LIMIT 50
            ) AS tbl `;

        var deferred = Q.defer();

        connection.query(QUERY).on('result', function(r){
            //if (r.rating !== null && p.num_games >= 10){

                RES.push({
                    rating:r.rating,
                    nick : p.nick,
                    num_games: p.num_games,
                    id: p.player_id
                });
            //}

        }).on('end', function(){
            deferred.resolve();
        });

        rating_promises.push(
            deferred.promise
        );


    }).on('end', function(){
        //connection.end();

        Q.allSettled(rating_promises).then(function(){

            console.log('ALL ENDED');
            insertRatings(RES);

            console.log('[ TOP ] -------------------------------');
            var data = _.sortByOrder(RES, ['rating'],['desc']);
            var i = 0;
            _.slice(data, 0, 50).filter(function(p){
                //console.log(p);
                i++;
                console.log("   "+ i + "\trating:" + p.rating +"\tnum_games:"+ p.num_games  + "\t" + p.nick);
            });


            console.log('[ BOTTOM ] -------------------------------');
            var data2 = _.sortByOrder(RES, ['rating'],['asc']);
            _.slice(data2, 0, 20).filter(function(p){
                //console.log(p);
                console.log("rating:" + p.rating +"\tnum_games:"+ p.num_games  + "\t" + p.nick);
            });

        });

        console.log('END');
    });


function insertRatings(RES) {

    _.each(RES, function(player){

        var rating = 250;
        if (player.rating !== null) {
            rating = player.rating;
        }

        connection.query('INSERT INTO player_rank (`player_id`, `rank`, `num_games`) VALUES (?, ?, ?)', [player.id, rating, player.num_games])
        .on('end', function(){

            console.log('inserted for player: '+ chalk.red(player.nick) + " " +chalk.green(player.rating));
        })

    });


}
