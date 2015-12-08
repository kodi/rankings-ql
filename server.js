var express    = require('express');        // call express
var mysql      = require('mysql');
var _          = require('lodash');
var chalk = require('chalk');
var expressWinston = require('express-winston');
var winston = require('winston'); // for transports.Console

var app        = express();                 // define our app using express
var port       = 4444;
var pool = mysql.createPool({
    connectionLimit : 10,
    host     : '127.0.0.1',
    user     : 'root',
    password : 'd0ct0rwh0',
    database : 'ratings_test'
});


var router = express.Router();              // get an instance of the express Router


router.get('/omega/elo/:ids', function(req, res) {
    console.log("players: " + chalk.red(req.params.ids));
    res.setHeader('Content-Type', 'application/json');
    var players = [];
    var ids = req.params.ids.split('+');

    var IN = ids.join(',');

    console.log(req.ip);
    pool.getConnection(function(err, connection) {
        // Use the connection
        connection.query("SELECT * FROM player_rank where player_id IN (" + IN + ")", function(err, result) {
            // And done with the connection.

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

                if(player.ctf.elo < 250) {
                    player.ctf.elo = 250;
                }

                if(player.ctf.elo > 750) {
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

            console.log('done, releaseing connection');
            connection.release();


        });
    });


});



// express-winston logger makes sense BEFORE the router.
app.use(expressWinston.logger({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true
        })
    ]
}));


app.use('/api', router);


// express-winston errorLogger makes sense AFTER the router.
app.use(expressWinston.errorLogger({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true
        })
    ]
}));

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
