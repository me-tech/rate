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

var hash = require("password-hash");
var validator = require('validator');

var db = require('./conn.js'); var transporter = require('./sendEmail.js');
//var db = require('./connLocal.js'); var transporter = require('./sendEmailLocal.js');

app.use(fileUpload());

app.get('/api/browse/prof', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var sql = 'SELECT User.Uname, User.Type, User.SchoolShort, User.Department, University.SchoolName, AVG(Rating.RateScore) AS RateScore, User.Email FROM User, University, Major, Rating WHERE User.SchoolShort = University.SchoolShort AND User.Mshort = Major.Mshort AND User.Type = "Professor" AND Rating.ProMail = User.Email GROUP BY Rating.ProMail';
    db.query(sql, function(err, rows) {
        if (err) {
            console.log(err);
            res.status(500).end(errorCode(500, "Database Error"));
        }else{
            var objs = [];
            for (var i = 0;i < rows.length; i++) {
                console.log(rows[i]);
                objs.push({Professor: rows[i].Uname, Type: rows[i].Type, SchoolName: rows[i].SchoolName, SchoolShort: rows[i].SchoolShort, Department: rows[i].Department, RateScore: rows[i].RateScore});
            }
            var result = {result: objs};
            res.status(200).end(JSON.stringify(result));
        }
    });


});

app.get('/api/browse/course', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var sql = 'SELECT ID, Cname, Code, Major FROM Course';
    db.query(sql, function(err, rows) {
        if (err) {
            console.log(err);
            res.status(500).end(errorCode(500, "Database Error"));
        }else{
            var objs = [];
            for (var i = 0;i < rows.length; i++) {
                objs.push({ID: rows[i].ID, Cname: rows[i].Cname, Code: rows[i].Code, Major: rows[i].Major});
            }
            var result = {result: objs};
            
            res.status(200).end(JSON.stringify(result));
        }
    });

});

app.post('/api/register', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var type = req.body.type;
    console.log(type);
    var uname = req.body.uname;
    var email = req.body.email;
    var school = 'OUHK';
    var password = req.body.password;
    var major = req.body.major;
    var department = req.body.department;

    if(!email || !password || !uname || !type){
        res.status(400).end(JSON.stringify({error: "Please fill in all fields."}));
    }else if(!major && !department){
        res.status(400).end(JSON.stringify({error: "Please fill in all fields."}));
    }else{
        if(!validator.isEmail(email) || !domainCheck(email)){
            res.status(400).end(JSON.stringify({error: "Please provide a proper email address."}));
        }else if(type==='Student' ||type==='Professor'){
            var input_array = [];
            //password = hash.generate(password);
            console.log('here');

            try{
                if(type=='Student'){
                input_array.push(uname,email,type,password,school,major);
                var sql = 'INSERT INTO User(Uname, Email, Type, Password, SchoolShort, Mshort) VALUES(?, ?, ?, ?, ?, ?)';
                }

                if(type=='Professor'){
                    input_array.push(uname,email,type,password,school,department,email);
                    var sql = 'INSERT INTO User(Uname, Email, Type, Password, SchoolShort, Department) VALUES(?, ?, ?, ?, ?, ?); INSERT INTO `Rating`(`ProMail`) VALUES(?);';
                }
            }finally{
                console.log(sql);
                sql = mysql.format(sql, input_array);
                db.query(sql, function(err, rows) {
                    if (err) {
                        console.log(err);
                        res.status(500).end(errorCode(500,"Database connection error"));
                    }else{
                        res.status(200).end(JSON.stringify({result: "Sucessfully registered."}))
                    }
                });
            }
        }else{
            console.log('type wrong');
        }
    }

});

app.post('/api/login', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var email = req.body.email;
    var password = req.body.password;

    if(!email || !password){
        res.status(400).end(JSON.stringify({error: "email or password missing"}));
    }else{
        var input_array = [];
        input_array.push(email,password);
        console.log(input_array);
        //input_array.push(password);
        
        var sql = 'SELECT User.Uname, User.Email, User.Type, User.Department, User.SchoolShort, User.Mshort, University.SchoolName, Major.Mname FROM User INNER JOIN University USING (SchoolShort) INNER JOIN Major USING (Mshort) WHERE User.Email = ? AND User.Password = ?';        
        sql = mysql.format(sql, input_array);
        console.log(sql);
        db.query(sql, function(err, rows) {
            if (err) {
                console.log(err);
                res.status(500).end(errorCode(500,"Database connection error"));
            }else{
            	console.log(rows[0]);
                try{
                    if(rows[0].Uname == null || !rows[0].Uname){
                    	console.log('1');
                        res.status(403).end(errorCode(403, "Wrong email or password"));
                    }else{
                        console.log(rows[0].Uname);
                        res.status(200).end(JSON.stringify({Uname: rows[0].Uname, Type: rows[0].Type, SchoolName: rows[0].SchoolName, Mname: rows[0].Mname, SchoolShort: rows[0].SchoolShort, Mshort: rows[0].Mshort}));
                    }
                }catch(e){
                    if(e instanceof TypeError){
                    	console.log(e);
                        res.status(403).end(errorCode(403, "Wrong email or password"));
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
        res.status(400).end(errorCode(400,"Please fill in the email address field."));
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
                        
                        var sql = mysql.format('UPDATE User set Password = "ZZZ" WHERE Email= ?', input_array);
                        db.query(sql, function(err, rows) {
                            if(err){
                                console.log(err);
                                res.status(500).end(errorCode(500,"Database connection error"));
                            }else{
                                try{
                                    sendEmail(email, 'Reset Password from METECH', '<p>Here is your new password : ZZZ</p>');
                                    res.status(200).end(JSON.stringify({message:"We have sent an email to your email address."}));
                                }catch(e){
                                    if(e instanceof TypeError){
                                        res.status();
                                    }
                                }
                            }
                        });
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
        res.status(204).end(errorCode(204,"No Content for Student"));
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

function sendEmail(to, subject, html) {
    transporter.sendMail({
      from: 'rate@metech.fighter.hk',
      to: to,
      subject: subject,
      html: html,
    }, function(err, info) {
      if (err) {
        console.log('Error: ' + err);
      } else {
        console.log('Success: ' + info);
      }
    });
}

function domainCheck(email) {
    var whiteList = ['ouhk.edu.hk', 'test.example'];

    var splitArray = email.split('@');

    if(whiteList.indexOf(splitArray[1]) >= 0){
        return true;
    }

    return false;
}

app.listen(process.env.PORT || 8099);