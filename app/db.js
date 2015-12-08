var mysql      = require('mysql');

var pool = mysql.createPool({
    connectionLimit : 10,
    host     : '127.0.0.1',
    user     : 'root',
    password : 'd0dct0rwh0',
    database : 'ratings_test'
});


module.exports = pool;
