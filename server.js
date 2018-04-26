'use strict';

var compression = require('compression');
var express = require('express');
var formidable = require('formidable');
var http = require('http');
var url = require('url');
var assert = require('assert');
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');

var mysql = require('mysql');

var app = express();
app.use(compression());
app.use(bodyParser.json());

var hash = require("password-hash");
var validator = require('validator');

// var db = require('./conn.js'); var transporter = require('./sendEmail.js');
var db = require('./connLocal.js'); var transporter = require('./sendEmailLocal.js');

app.use(fileUpload());

app.get('/api/browse/:key', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    if(req.params.key){
        switch(req.params.key){
            case 'course':
                var sql = 'SELECT * FROM Course';
                break;
            case 'major':
                var sql = 'SELECT * FROM Major WHERE NOT Mshort = "PROF" ';
                break;
            case 'prof':
                var sql = 'SELECT User.Uname AS Professor, User.Type, User.SchoolShort, User.Department, University.SchoolName, AVG(Rating.RateScore) AS RateScore, User.Email FROM User, University, Major, Rating WHERE User.SchoolShort = University.SchoolShort AND User.Mshort = Major.Mshort AND User.Type = "Professor" AND Rating.ProMail = User.Email GROUP BY Rating.ProMail';
                break;
            default:
                res.status(403).end(errorCode(403, "Table forbidden."));
                break;
        }
    }else{
        res.status(400).end(errorCode(400, "Table not specified."));
    }

    db.query(sql, function(err, rows) {
        if (err) {
            console.log(err);
            res.status(500).end(errorCode(500, "Database Error"));
        }else{
            var objs = [];
            for (var i = 0;i < rows.length; i++) {
                objs.push(rows[i]);
            }
            var result = {result: objs};
            
            res.status(200).end(JSON.stringify(result));
        }
    });

});

app.get('/api/search/prof/:email/', function(req,res){
    console.log(req.path);
    res.type('json');

    if(!req.params.email){
        res.status(400).end(errorCode(400, 'No Professor email unspecified.'));
    }

    if(req.params.email){
        console.log(req.params.email);
        var input_array = [];
        var email = req.params.email;
        input_array.push(email);
        var sql = 'SELECT u.Uname, `Type`,`SchoolShort`,`Department`, AVG(Rating.RateScore) AS RateScore FROM User u, Course c, Rating r WHERE u.Uname =c.Lecturer AND r.ProMail = u.Email AND u.Email = ?';
        db.query(sql, input_array, function(err, rows) {
            if (err) {
                console.log(err);
            }else if (!rows.length){
                res.status(404).end(errorCode(404, "Prof. Not Found"));
            }else{
                console.log(JSON.stringify(rows[0]));
                res.status(200).end(JSON.stringify(rows[0]));
            }
        });
    }    
});

app.get('/api/comments/:email/:courseCode', function(req,res){
    console.log(req.path);
    res.type('json');

    if(!req.params.email){
        res.status(400).end(errorCode(400,'No Professor email unspecified.'));
    }else if (!req.params.courseCode){
        res.status(400).end(errorCode(400,'No course code unspecified.'));
    }

    if(req.params.email && req.params.courseCode){
        console.log(req.path+" succeed");

        var input_array = [];
        var email = req.params.email;
        var courseCode = req.params.courseCode;
        input_array.push(email,courseCode);

        var sql = 'SELECT DISTINCT(u.Uname), r.RateComment AS RateComment FROM Rating r INNER JOIN User u ON r.Email = u.Email INNER JOIN Course c ON r.ProMail = c.Lecturer INNER JOIN Course ON c.Code = r.Code WHERE r.Promail = ? AND r.Code = ? ';
        db.query(sql, input_array, function(err, rows) {
            if (err) {
                console.log(err);
            }else if (!rows.length){
                res.status(404).end(errorCode(404, "Prof. Not Found"));
            }else{
                var objs = [];
                for (var i = 0;i < rows.length; i++) {
                    objs.push(rows[i]);
                }
                var result = {result: objs};

                res.status(200).end(JSON.stringify(result));
            }
        });
    }

});

app.post('/api/rate', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var email = req.body.email;
    var promail = req.body.promail;
    var code = req.body.code;

    var score = req.body.score;
    var difficulty = req.body.difficulty;
    var takeagain = req.body.takeagain;

    var comment = "";
    comment = req.body.comment;

    if(!email || !promail || !code || !score || !difficulty || !takeagain){
        res.status(400).end(errorCode(400, "Please provide all fields. Comment is optional."));
    }else{

        var input_array = [];
        input_array.push(email,score,code,promail,difficulty,takeagain,comment);
        var sql = "insert into Rating (Email,RateScore,Code,ProMail,Difficulty,TakeAgain,RateComment) values(?,?,?,?,?,?,?)";
        sql = mysql.format(sql, input_array);

        db.query(sql, function(err, rows) {
            if (err) {
                console.log(err);
                res.status(500).end(errorCode(500, "Database Error"));
            }else{
                res.status(200).end(errorCode(200, "Rate inserted."));
            }
        });
    }

});

app.get('/api/courseList/:email/', function(req,res){
    console.log(req.path);
    res.type('json');

    if(!req.params.email){
        res.status(400).end(errorCode(400,'No Professor email unspecified.'));
    }

    if(req.params.email){
        console.log(req.params.email);
        var input_array = [];
        var email = req.params.email;
        input_array.push(email);
        var sql = 'SELECT c.Code FROM User u, Course c WHERE c.Lecturer = u.Email AND u.Email = ?';
        db.query(sql, input_array, function(err, rows) {
            if (err) {
                console.log(err);
            }else if (!rows.length){
                res.status(404).end(errorCode(404, "Prof. Not Found"));
            }else{
                var objs = [];
                for (var i = 0;i < rows.length; i++) {
                    objs.push(rows[i].Code);
                }
                var result = {result: objs};

                res.status(200).end(JSON.stringify(result));
            }
        });
    }

});

app.get('/api/rating/:email/:courseCode', function(req,res){
    console.log(req.path);
    res.type('json');

    if(!req.params.email){
        res.status(400).end(errorCode(400,'No Professor email unspecified.'));
    }else if (!req.params.courseCode){
        res.status(400).end(errorCode(400,'No course code unspecified.'));
    }

    if(req.params.email && req.params.courseCode){
        console.log(req.path+" succeed");

        var input_array = [];
        var email = req.params.email;
        var courseCode = req.params.courseCode;
        input_array.push(email,courseCode);

        var sql = 'SELECT AVG(r.RateScore) AS RateScore, ROUND(AVG(r.Difficulty),0) AS Difficulty, AVG(DISTINCT r.TakeAgain) / COUNT(DISTINCT r.TakeAgain) AS TakeAgain FROM User u, Course c, Rating r WHERE c.Lecturer = u.Email AND r.ProMail = u.Email AND u.Email = ? AND r.Code = ? GROUP BY r.ProMail';
        db.query(sql, input_array, function(err, rows) {
            if (err) {
                console.log(err);
            }else if (!rows.length){
                res.status(404).end(errorCode(404, "Prof. Not Found"));
            }else{
                var objs = [];
                for (var i = 0;i < rows.length; i++) {
                    objs.push(rows[i]);
                }
                var result = {result: objs};

                res.status(200).end(JSON.stringify(result));
            }
        });
    }
});

app.post('/api/create/class', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var email = req.body.email;
    var code = req.body.code;

    if(!email){
        res.status(400).end(errorCode(400,'No Professor email unspecified.'));
    }else if (!code){
        res.status(400).end(errorCode(400, 'No course code unspecified.'));
    }

    if(email && code){
        var input_array = [];
        input_array.push(email,code);

        var sql = "insert into Class (Email,Code) values(?,?);";
        sql = mysql.format(sql, input_array);

        db.query(sql, function(err, rows) {
            if (err) {
                console.log(err);
                res.status(500).end(errorCode(500, "Database Error"));
            }else{
                var result = {classID: rows.insertId}
                res.status(200).end(JSON.stringify({result}));
            }
        });
    }
});

app.post('/api/join/class', function(req, res) {
    console.log(req.path);
    console.log(req.body);
    res.type('json');

    var email = req.body.email;
    var code = req.body.code;

    if(!email){
        res.status(400).end(errorCode(400,'No Professor email unspecified.'));
    }else if (!code){
        res.status(400).end(errorCode(400, 'No course code unspecified.'));
    }

    if(email && code){
        var input_array = [];
        input_array.push(email,code);

        var sql = "insert into Class (Email,Code) values(?,?);";
        sql = mysql.format(sql, input_array);

        db.query(sql, function(err, rows) {
            if (err) {
                console.log(err);
                res.status(500).end(errorCode(500, "Database Error"));
            }else{
                var result = {classID: rows.insertId}
                res.status(200).end(JSON.stringify({result}));
            }
        });
    }
});

app.post('/api/feedback/create/:email/:classID', function(req,res){
    console.log(req.path);
    res.type('json');

    if(!req.params.email){
        res.status(400).end(errorCode(400,'No Professor email unspecified.'));
    }else if (!req.params.classID){
        res.status(400).end(errorCode(400,'No course code unspecified.'));
    }

    if(req.params.email && req.params.classID){
        console.log(req.path+" succeed");

        var input_array = [];
        var classID = req.params.classID;
        var week = req.params.week;
        var email = req.params.email;
        var comment = req.params.comment;

        var ans1 = req.params.ans1;
        var ans2 = req.params.ans2;
        var ans3 = req.params.ans3;
        var ans4 = req.params.ans4;
        var ans5 = req.params.ans5;

        input_array.push(classID,email);

        var sql = "INSERT INTO Class c(ID,) VALUES(?); SELECT LAST_INSERT_ID();";
        db.query(sql, input_array, function(err, rows) {
            if (err) {
                console.log(err);
            }else if (!rows.length){
                res.status(500).end(errorCode(500, "DB Error"));
            }else{
                if(row[0].ClassID){
                    res.status(200).end(errorCode(200, row[0].ClassID));
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
                        res.status(200).end(JSON.stringify({Uname: rows[0].Uname, Type: rows[0].Type, Department: rows[0].Department, SchoolName: rows[0].SchoolName, Mname: rows[0].Mname, SchoolShort: rows[0].SchoolShort, Mshort: rows[0].Mshort}));
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
                    var major = 'PROF';
                    input_array.push(uname,email,type,password,school,department,major,email);
                    var sql = 'INSERT INTO User(Uname, Email, Type, Password, SchoolShort, Department, Mshort) VALUES(?, ?, ?, ?, ?, ?, ?); INSERT INTO `Rating`(`ProMail`) VALUES(?);';
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


function unEscape(str){
    return str.replace(/\+/g," ");
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
    var whiteList = ['ouhk.edu.hk', 'test.example', 'example.com'];

    var splitArray = email.split('@');

    if(whiteList.indexOf(splitArray[1]) >= 0){
        return true;
    }

    return false;
}

// var gen;
// function run(generator) {
//     gen = generator();
//     gen.next();
// }

// function getProfDepartment(Uname){
//     var sql = 'SELECT u.Uname, `Type`,`SchoolShort`,`Mshort`,`Department` FROM User u, Course c WHERE u.Uname =c.Lecturer AND u.Uname = ?';
//     db.query(sql, Uname, function(err, rows) {
//         if (err) {
//             console.log(err);
//         }else if (!rows.length){
//             gen.next(null);
//         }else{
//             console.log(JSON.stringify(rows[0]));
//             gen.next(JSON.stringify(rows[0]));
//         }
//     });
// }

// function getProfInfo(Email){
//     //SQL where Email = Email

//     //return Uname, Uni Full Name, Major Full Name
// }

// function getUniName(SchoolShort) {

//     var sql = 'SELECT SchoolName FROM University WHERE SchoolShort = ?';
//     db.query(sql, SchoolShort, function(err, rows) {
//         if (err) {
//             console.log(err);
//         }else{
//             console.log(rows[0].SchoolName);
//             return rows[0].SchoolName;
//         }
//     });

// };

// function getMajorName(Mshort) {
//     //SQL where Mshort = Mshort

//     //return Major FullName

// }

app.listen(process.env.PORT || 8099);