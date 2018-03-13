var mysql = require('mysql');

var pool  = mysql.createPool({
    user: process.env.DBUSER,
    password: process.env.DBPWD,
    host: process.env.HOST,
    port: '3306',
    database: process.env.DB,
    waitForConnections : true,
    connectionLimit : 50,
    connectTimeout  : 60 * 60 * 1000,
    acquireTimeout   : 60 * 60 * 1000,
    timeout         : 60 * 60 * 1000,
});

pool.getConnection(function(err, connection) {
    if(err){
        console.log(err);
    }else{
        console.log("DB pool connection success");
    }
});

pool.on('error', function(err) {
  console.log(err.code); // 'ER_BAD_DB_ERROR' 
  // https://www.npmjs.com/package/mysql#error-handling
});

module.exports = pool;

const NotifmeSdk = require('notifme-sdk').default;

const notifme = new NotifmeSdk({
  channels: {
    email: {
      providers: [{
        type: 'sparkpost',
        apiKey: process.env.SPARKPOST_API_KEY,
      }]
    }
  }
});

module.exports = notifme;