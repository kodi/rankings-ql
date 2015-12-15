var mysql       = require('mysql');
var Config      = require('../config/config');

var pool = mysql.createPool(Config.db);


module.exports = pool;