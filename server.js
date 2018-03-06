'use strict'

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

var db = require('./conn.js');
// var db = require('./connLocal.js');

app.use(fileUpload());

app.get('/api/browse/prof', function(req, res) {
    console.log(req.path);
    console.log(req.body);

    res.status(200);
    res.type('json');


    var sql = 'SELECT Uname, SchoolShort, Mshort FROM User';
    db.query(sql, function(err, rows) {
        if (err) {
            console.log(err);
            dberror();
        }else{
            var objs = [];
            for (var i = 0;i < rows.length; i++) {
                var uniName = getUniName(rows[i].SchoolShort);
                console.log(uniName);
                console.log(rows[i].SchoolShort);
                //var majorName = getMajorName(rows[i].Mshort);
                objs.push({Professor: rows[i].Uname, School: uniName, Major: rows[i].Mshort});
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

app.get('/api/browse/university', function(req, res) {
    console.log(req.path);
    console.log(req.body);

    res.status(200);
    res.type('json');


    var sql = 'SELECT ID, SchoolName, SchoolShort FROM University';
    db.query(sql, function(err, rows) {
        if (err) {
            console.log(err);
            dberror();
        }else{
            var objs = [];
            for (var i = 0;i < rows.length; i++) {
                objs.push({ID: rows[i].ID, SchoolName: rows[i].SchoolName, SchoolShort: rows[i].SchoolShort});
            }
            var result = {result: objs};
            res.end(JSON.stringify(result));
        }
    });

});

app.post('/api/login', function(req, res) {
    console.log('/api/login');
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
        var sql = mysql.format('SELECT Uname, Type, SchoolShort, Mshort FROM User WHERE Email = ? AND Password = ?', input_array);
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
                        res.end(JSON.stringify({Uname: rows[0].Uname, Type: rows[0].Type, SchoolShort: rows[0].SchoolShort, Mshort: rows[0].Mshort}));
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

app.get('/api/restaurant/read/:key/:value', function(req, res) {

    var criteria = {};
    criteria[req.params.key] = req.params.value;
    console.log(criteria);
    
    //database operation
});

app.get('/api/search/user/:key/:value', function(req,res){
    console.log(req.path);
    res.type('json');
    res.status(200);

    if(req.params.key == "Student"){

    }

    if(req.params.key == "Professor"){
        console.log(req.params.value);
        console.log(unEscape(req.params.value));
        run(function* (){
            var result = yield getProfDepartment(unEscape(req.params.value));
            yield res.end(result);
        });
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

app.listen(process.env.PORT || 8099);