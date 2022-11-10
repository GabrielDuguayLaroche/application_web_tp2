var express = require('express');
const cors = require("cors");

const cookieParser = require("cookie-parser");
const session = require("express-session");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const path = require("path");

var app = express();
app.use(express.static(path.join(__dirname, 'build')));
app.use(express.json());

app.use(
    cors({
        origin: ["https://application-web-tp2.herokuapp.com/"],
        methods: ["GET", "POST", "DELETE"],
        credentials: true,
    })
);

app.use(cookieParser());
app.use(
    session({
        key: "userId",              // nom du cookie
        secret: "subscribe",        // utilisé pour hasché l'id de session
        resave: false,              // a vous de trouver l'utilité
        saveUninitialized: false,   //a vous de trouver l'utilité
        cookie: {                   //
            expires: 60 * 60 * 24,  // 24 heures
        },
    })
);

var mysql = require('mysql');
var conn = mysql.createConnection({
    database: 'defaultdb',
    host: "mysql-tp2-cegeplimoilou-be29.aivencloud.com",
    user: 'userTp2',
    password: 'AVNS_heccmwyaLtucE4WsvAH',
    port: '10964'
});

conn.connect((err) => {
    if (err) throw err;
    console.log('Connected');

    // Drop event table
    var sql3 = "DROP TABLE IF EXISTS event ";

    conn.query(sql3, (err, results) => {
        if (err) throw err;
        console.log("Table event dropped");
    });

    // Drop user table
    var sql1 = "DROP TABLE IF EXISTS user ";

    conn.query(sql1, (err, results) => {
        if (err) throw err;
        console.log("Table user dropped");
    });

    // Create user Table.
    var sql2 = "CREATE TABLE user " +
        " (id INT not null AUTO_INCREMENT, " +
        " username VARCHAR(255), " +
        " password VARCHAR(255), " +
        " PRIMARY KEY (id)," +
        " CONSTRAINT UC_username UNIQUE (username) )";

    conn.query(sql2, (err, results) => {
        if (err) throw err;
        console.log("Table user created");
    });

    // Create event Table.
    var sql4 = "CREATE TABLE event " +
        " (id INT not null AUTO_INCREMENT, " +
        " title VARCHAR(255), " +
        " date VARCHAR(255), " +
        " userId INT, " +
        " PRIMARY KEY (id), " +
        " FOREIGN KEY (userId) REFERENCES user(id))";

    conn.query(sql4, (err, results) => {
        if (err) throw err;
        console.log("Table event created");
    });

    //Add user for tests
    conn.query(
        "INSERT INTO user (username, password) VALUES ('gabriel'," +
        "'$2b$10$v1l/stAAXFQEbquFJ3Aj8O6vW51KU8wLaeYMPChP7hrN1XRVDTCDa')",
        (err, results) => {
            if (err) throw err;
        }
    );

    // Add events for tests
    for (let i = 1; i < 10; i++) {
        var sql = "INSERT INTO event (title, date, userId) VALUES ('test', '2022-09-10', " + 1 + ");"

        if (i == 1 || i == 2) {
            for (let j = 0; j < 3; j++) {
                conn.query(sql, (err, results) => {
                    if (err) throw err;
                });
            }
        } else {
            conn.query(sql, (err, results) => {
                if (err) throw err;
            });
        }
    }
});

app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.log(err);
        }

        conn.query(
            "INSERT INTO user (username, password) VALUES (?,?)",
            [username, hash],
            (err, result) => {
                if (err) {
                    res.send({ message: "This username is already taken!" });
                } else {
                    res.status(200).end();
                }
            }
        );
    });
});

app.get("/login", (req, res) => {
    console.log("/login GET");
    console.log(req.session.user);
    if (req.session.user) {
        res.send({ loggedIn: true, user: req.session.user });
    } else {
        res.send({ loggedIn: false });
    }
});

app.post("/login", (req, res) => {
    console.log("/login POST");

    const username = req.body.username;
    const password = req.body.password;

    conn.query(
        "SELECT * FROM user WHERE username = ?;",
        [username],
        (err, results) => {
            if (err) {
                res.send({ err: err });
            }

            if (results.length > 0) {
                bcrypt.compare(password, results[0].password, (error, response) => {
                    if (response) {
                        req.session.user = results;
                        console.log(req.session.user);
                        res.send(results);
                    } else {
                        res.send({ message: "Mauvaise combinaison de nom d'utilisateur/mot de passe!" });
                    }
                });
            } else {
                res.send({ message: "L'utilisateur n'existe pas!" });
            }
        }
    );
});

app.post('/logout', (req, res) => {
    console.log("/logout POST");

    res.clearCookie('userId');

    res.status(200).send();
});

app.get('/getAllUsers', (req, res) => {
    console.log("/getAllUsers GET");

    conn.query(
        "SELECT * FROM user",
        (err, results) => {
            if (err) throw err;
            console.log(results);
            res.send(results);
        }
    );
});

app.get('/getEventsByUserId', (req, res) => {
    console.log("/getEventsByUserId GET");

    conn.query(
        "SELECT * FROM event WHERE userId = ?",
        [req.query.userId],
        (err, results) => {
            if (err) throw err;
            console.log(results);
            res.send(results);
        }
    );
});

app.post('/addEvent', (req, res) => {
    console.log("/addEvent POST");

    conn.query(
        "INSERT INTO event (title, date, userId) VALUES (?, ?, ?);",
        [req.body.title, req.body.date, req.body.userId],
        (err, results) => {
            if (err) throw err;
        }
    );

    res.status(200).end();
});

app.delete('/deleteEvent', (req, res) => {
    console.log("/deleteEvent DELETE");

    conn.query(
        "DELETE FROM event WHERE id = ?",
        [req.body.id],
        (err, results) => {
            if (err) throw err;
        }
    );

    res.status(200).end();
});

const port = process.env.PORT || 8081;
var server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
})