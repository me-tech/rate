'use strict';

var express = require('express');
var formidable = require('formidable');
var http = require('http');
var url = require('url');
var assert = require('assert');
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');

var mysql = require('mysql');

var app = express();
app.use(bodyParser.json());

var db = require('./conn.js'); var notifme = require('./sendEmail.js');
//var db = require('./connLocal.js'); var notifme = require('./sendEmailLocal.js');

app.use(fileUpload());

app.get('/api/browse/prof', function(req, res) {
    console.log(req.path);
    console.log(req.body);

    res.status(200);
    res.type('json');

    var sql = 'SELECT User.Uname, User.Type, User.SchoolShort, User.Mshort, University.SchoolName, Major.Mname, AVG(Rating.RateScore) AS RateScore, User.Email FROM User, University, Major, Rating WHERE User.SchoolShort = University.SchoolShort AND User.Mshort = Major.Mshort AND User.Type = "Professor" AND Rating.ProMail = User.Email GROUP BY Rating.ProMail';
    db.query(sql, function(err, rows) {
        if (err) {
            console.log(err);
            dberror();
        }else{
            var objs = [];
            for (var i = 0;i < rows.length; i++) {
                console.log(rows[i]);
                objs.push({Professor: rows[i].Uname, Type: rows[i].Type, SchoolName: rows[i].SchoolName, Mname: rows[i].Mname, SchoolShort: rows[i].SchoolShort, Mshort: rows[i].Mshort, RateScore: rows[i].RateScore});
            }
            var result = {result: objs};
            res.end(JSON.stringify(result));
        }
    });


});

app.get('/api/browse/course', function(req, res) {
    console.log(req.path);
    console.log(req.body);

    res.status(200);
    res.type('json');

    var sql = 'SELECT ID, Cname, Code, Major FROM Course';
    db.query(sql, function(err, rows) {
        if (err) {
            console.log(err);
            dberror();
        }else{
            var objs = [];
            for (var i = 0;i < rows.length; i++) {
                objs.push({ID: rows[i].ID, Cname: rows[i].Cname, Code: rows[i].Code, Major: rows[i].Major});
            }
            var result = {result: objs};
            res.end(JSON.stringify(result));
        }
    });

});

app.post('/api/register', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var uname = req.body.uname;
    var email = req.body.email;
    var password = req.body.password;
    var major = req.body.programmeName;

    if(!email || !password){
        res.end(JSON.stringify({error: "email or password missing"}));
    }else{
        var input_array = [];
        input_array.push(email);
        input_array.push(password);
        var sql = 'SELECT User.Uname, User.Type, User.SchoolShort, User.Mshort, University.SchoolName, Major.Mname FROM User, University, Major WHERE User.SchoolShort = University.SchoolShort AND User.Mshort = Major.Mshort AND User.Email = ? AND User.Password = ?';
        sql = mysql.format(sql, input_array);
        db.query(sql, function(err, rows) {
            if (err) {
                console.log(err);
                res.end(errorCode(500,"Database connection error"));
            }else{
                try{
                    if(rows[0].Uname == null || !rows[0].Uname){
                        res.end(errorCode(403, "Wrong email or password"));
                    }else{
                        console.log(rows[0].Uname);
                        sendEmail('victor.siu.528@gmail.com', 'testing from login', '<p>Just a Test</p>');
                        res.end(JSON.stringify({Uname: rows[0].Uname, Type: rows[0].Type, SchoolName: rows[0].SchoolName, Mname: rows[0].Mname, SchoolShort: rows[0].SchoolShort, Mshort: rows[0].Mshort}));
                    }
                }catch(e){
                    if(e instanceof TypeError){
                        res.end(errorCode(403, "Wrong email or password"));
                    }
                }
            }
        });
    }

});

app.post('/api/login', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');
    res.status(200);

    var email = req.body.email;
    var password = req.body.password;

    if(!email || !password){
        res.end(JSON.stringify({error: "email or password missing"}));
    }else{
        var input_array = [];
        input_array.push(email);
        input_array.push(password);
        var sql = 'SELECT User.Uname, User.Type, User.SchoolShort, User.Mshort, University.SchoolName, Major.Mname FROM User, University, Major WHERE User.SchoolShort = University.SchoolShort AND User.Mshort = Major.Mshort AND User.Email = ? AND User.Password = ?';
        sql = mysql.format(sql, input_array);
        db.query(sql, function(err, rows) {
            if (err) {
                console.log(err);
                res.end(errorCode(500,"Database connection error"));
            }else{
                try{
                    if(rows[0].Uname == null || !rows[0].Uname){
                        res.end(errorCode(403, "Wrong email or password"));
                    }else{
                        console.log(rows[0].Uname);
                        res.end(JSON.stringify({Uname: rows[0].Uname, Type: rows[0].Type, SchoolName: rows[0].SchoolName, Mname: rows[0].Mname, SchoolShort: rows[0].SchoolShort, Mshort: rows[0].Mshort}));
                    }
                }catch(e){
                    if(e instanceof TypeError){
                        res.end(errorCode(403, "Wrong email or password"));
                    }
                }
            }
        });
    }

});

app.post('/api/forget', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var email = req.body.email;

    if(!email){
        res.end(JSON.stringify({error: "email missing"}));
    }else{
        var input_array = [];
        input_array.push(email);
        var sql = mysql.format('SELECT Uname FROM User WHERE Email = ?', input_array);
        db.query(sql, function(err, rows) {
            if (err) {
                console.log(err);
                res.status(500).end(errorCode(500,"Database connection error"));
            }else{
                try{
                    if(rows[0].Uname == null || !rows[0].Uname){
                        res.status(403).end(errorCode(403, "User does not exist."));
                    }else{
                        console.log(rows[0].Uname);
                        
                        db.query(sql, function(err, rows) {
                            if(err){
                                console.log(err);
                                res.status(500).end(errorCode(500,"Database connection error"));
                            }else{
                                try{

                                }catch(e){
                                    if(e instanceof TypeError){
                                        res.status();
                                    }
                                }
                            }
                        });

                        res.status(200).end(JSON.stringify({message:"We have sent an email to your email address."}));
                    }
                }catch(e){
                    if(e instanceof TypeError){
                        res.status(403).end(errorCode(403, "User does not exist."));
                    }
                }
            }
        });
    }
});

app.get('/api/search/user/:key/:value', function(req,res){
    console.log(req.path);
    res.type('json');

    if(req.params.key == "Student"){
        res.status(204);
        res.end(errorCode(204,"No Content for Student"));
    }

    if(req.params.key == "Professor"){
        console.log(req.params.value);
        console.log(unEscape(req.params.value));

        var Uname = unEscape(req.params.value);
        var sql = 'SELECT u.Uname, `Type`,`SchoolShort`,`Mshort`,`Department` FROM User u, Course c WHERE u.Uname =c.Lecturer AND u.Uname = ?';
        db.query(sql, Uname, function(err, rows) {
            if (err) {
                console.log(err);
            }else if (!rows.length){
                res.status(404).end(errorCode(404, "Prof. Not Found"));
            }else{
                console.log(JSON.stringify(rows[0]));
                res.status(200).end(JSON.stringify(rows[0]));
            }
        });
        // run(function* (){
        //     var result = yield getProfDepartment(unEscape(req.params.value));
        //     yield res.send(result);
        //     if(result == null){
        //         res.status(404).send(errorCode(404, "Prof. Not Found"));
        //     }
        // });
    }
});

var gen;
function run(generator) {
    gen = generator();
    gen.next();
}

function unEscape(str){
    return str.replace(/\+/g," ");
}

function getProfDepartment(Uname){
    var sql = 'SELECT u.Uname, `Type`,`SchoolShort`,`Mshort`,`Department` FROM User u, Course c WHERE u.Uname =c.Lecturer AND u.Uname = ?';
    db.query(sql, Uname, function(err, rows) {
        if (err) {
            console.log(err);
        }else if (!rows.length){
            gen.next(null);
        }else{
            console.log(JSON.stringify(rows[0]));
            gen.next(JSON.stringify(rows[0]));
        }
    });
}

function getProfInfo(Email){
    //SQL where Email = Email

    //return Uname, Uni Full Name, Major Full Name
}

function getUniName(SchoolShort) {

    var sql = 'SELECT SchoolName FROM University WHERE SchoolShort = ?';
    db.query(sql, SchoolShort, function(err, rows) {
        if (err) {
            console.log(err);
        }else{
            console.log(rows[0].SchoolName);
            return rows[0].SchoolName;
        }
    });

};

function getMajorName(Mshort) {
    //SQL where Mshort = Mshort

    //return Major FullName

}

function errorCode(status, message){
    return JSON.stringify({"status": status, "message": message});
}

function dberror(){
    return res.end(errorCode(500, "Database Error"));
}

function sendEmail(to, subject, html) {
    notifme.send({
      email: {
        from: 'rate@metech.fighter.hk',
        to: to,
        subject: subject,
        html: html,
      }
    }).then(console.log);
}

app.listen(process.env.PORT || 8099);