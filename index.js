"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const https = require("https");
const http = require('https');
const restService = express();
const {dialogflow, actionssdk, BasicCard, Image} = require('actions-on-google');
const {Suggestions, SignIn, NewSurface, SimpleResponse} = require('actions-on-google');
const app = dialogflow({debug: true, clientId: 'php-dialogflow-by-sri'});
const functions = require('firebase-functions');
const fetch = require('isomorphic-fetch');

restService.use(bodyParser.urlencoded({extended: true}));
restService.use(bodyParser.json({type: 'application/json'}));

// Welcome Intent
app.intent('Default Welcome Intent', (conv) => {
	//rest api to get data from strapi => response you add in conv.ask(....)
	var Request = require("request");
    Request.get({
    "headers": { "content-type": "application/json" },
    "url": "localhost:1337/responses",
    "body": JSON.stringify({
       "intent_name": "Default Welcome Intent"
    })
    }, (error, response, body) => {
    if(error) {
     return console.dir(error);
    }
    console.dir(JSON.parse(body));
	var data= JSON.parse(body);
});
	//conv.ask("Greetings! Message from static webhook");
	  conv.ask(response.post(data));
	conv.add(new Suggestions('Sign in'));    
});

restService.post('/v2/webhook', app) ;

restService.listen(process.env.PORT || 8000, function() {
  console.log("Server up and listening");
});

