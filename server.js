var express    = require('express');        // call express
var mysql      = require('mysql');
var _          = require('lodash');
var chalk = require('chalk');

var app        = express();                 // define our app using express
var port       = 4444;
var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : '',
    database : 'ratings_test'
});


var router = express.Router();              // get an instance of the express Router


router.get('/omega/elo/:ids', function(req, res) {
    console.log("players: " + chalk.red(req.params.ids));
    res.setHeader('Content-Type', 'application/json');
    var players = [];
    var ids = req.params.ids.split('+');

    var IN = ids.join(',');

    //console.log(IN);
    connection.query("SELECT * FROM player_rank where player_id IN (" + IN + ")", function(err, result){

        //console.log(result);

        var playerIndex = {};
        _.each(result, function(player){


            var p = {
                steamid : player.player_id,
                ctf :{
                    elo : player.rank,
                    games : player.num_games

                }
            };

            playerIndex[player.player_id] = true;
            players.push(p);

        });


        //apply the cap
        _.each(players, function(player){

            if(player.ctf.elo > 250) {
                player.ctf.elo = 250;
            }

            if(player.ctf.elo < 750) {
                player.ctf.elo = 750;
            }

        });


        //new players
        _.each(ids, function(id){
            if(typeof playerIndex[id] === 'undefined'){
                var p = {
                    steamid : id,
                    ctf :{
                        elo : 275,
                        games : 0
                    }
                };

                players.push(p);
            }

        });

        res.send(JSON.stringify({players: players}));

    });

});


app.use('/api', router);


// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);