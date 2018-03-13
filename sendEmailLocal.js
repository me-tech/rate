var nodemailer = require('nodemailer');
var sparkPostTransport = require('nodemailer-sparkpost-transport');
var transporter = nodemailer.createTransport(sparkPostTransport({sparkPostApiKey: '80952a63a56a518089c9b5aa0342a240ac221c6d'}));


module.exports = transporter;