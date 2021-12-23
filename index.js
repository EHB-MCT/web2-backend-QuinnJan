const express = require('express');
const cors = require('cors');
const got = require('got');
const fs = require('fs/promises');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const PORT = process.env.PORT || 5500
const {
    MongoClient
} = require('mongodb');
const config = require('./config.json');

// mongodb

const client = new MongoClient(config.finalUrl);
const app = express();

app.use(bodyParser.json());

app.use(cors());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/test', async (req, res) => {
    res.status(200).send({
        'result': 'Test succeeded'
    });
})

app.post('/signup', (req, res) => {
    console.log(req.body);
    collection = db.collection("email");
    if (req.body.email) {
        collection.insertOne(req.body).then(result => {
            console.log(result);
        });
    }
    res.status(201).send('OK');
});

// Push note in database (after checking info of note)

app.post('/note', async (req, res) => {
    let accesscode = req.headers.authorization;
    if (!accesscode) {
        res.status(500).send({
            "error": "missing access code"
        })
        return;
    }

    try {
        let response = await got("https://www.strava.com/api/v3/athlete/", {
            headers: {
                "Authorization": accesscode
            },
            json: true
        });

        if (!req.body.note || !req.body.id || !response.body.id) {
            res.status(400).send({
                "error": "Not all info"
            })
            return;
        }

        try {
            await client.connect();
            const collection = client.db('Strava').collection('Notes');
            const note = {
                userid: response.body.id,
                trackid: req.body.id,
                note: req.body.note
            };

            let query = {
                _id: req.body.id
            };

            let result = await collection.replaceOne(query, note, {
                upsert: true
            });

        } catch (error) {
            throw error;
            console.log(error);
        }

        res.status(200).send();

    } catch (error) {
        res.status(500).send({
            "error": "something went wrong",
            "e": JSON.stringify(error)
        });
    }
});

// Get note from database

app.get('/note', async (req, res) => {
    let accesscode = req.headers.authorization;
    if (!accesscode) {
        res.status(500).send({
            "error": "missing access code"
        })
        return;
    }

    try {
        let response = await got("https://www.strava.com/api/v3/athlete/", {
            headers: {
                "Authorization": accesscode
            },
            json: true
        });

        try {
            await client.connect();
            const collection = client.db('Strava').collection('Notes');
            let query = {
                userid: response.body.id
            };

            await collection.find(query).toArray((err, result) => {
                if (err) {
                    throw err;
                }
                res.status(200).send(result);
            });

        } catch (error) {
            console.log(error);
            throw err;
        }

    } catch (error) {
        res.status(500).send({
            "error": "something went wrong",
            "e": JSON.stringify(error)
        });
    }
});

app.listen(PORT, () => {
    console.log('API is running at http://localhost:${PORT}');
})