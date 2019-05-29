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
    if ('accessToken' in conv.request.user) {
        return getUserName(conv);
    } else {
        const resptext = '<speak>Greetings! <break time="1" />It looks like your test app account is not linked yet. <break time="1" />Please say Sign in for account linking.</speak>';
        conv.ask(new SimpleResponse({
            speech: resptext,
            text: "Greetings! It looks like your test app account is not linked yet. Please do Sign In for account linking.",
        }));
        conv.add(new Suggestions('Sign in'));
    }
});

// Create a Dialogflow intent with the `actions_intent_SIGN_IN` event (for Account Linking)
app.intent('Do Sign In', (conv, signin) => {  
  const capability = 'actions.capability.SCREEN_OUTPUT';
  if (conv.surface.capabilities.has(capability)) {         
    conv.ask(new SignIn('To keep using "my test app" '));
  } else {
    conv.ask(new NewSurface({
    capabilities: capability,
    context: 'To use this skill you need to sign in ',
    notification: 'Please sign in!',
    }));
  }
});

app.intent('SignIn Confirmation', (conv, params, signin) => {
    if(signin.status === 'OK')
    {
        return getUserName(conv);
    }else{
        conv.ask(' Sorry! we are unable to Link your account.');
    }

});

app.intent('get user name', (conv) => {
    return getUserName(conv);
});

function getUserName(conv) {
    return fetch('https://php-backend-for-dialogflow.herokuapp.com/get_user_name.php?access_token=' + conv.request.user.accessToken)
        .then((response) => {
            if (response.status < 200 || response.status >= 300) {
                throw new Error(response.statusText);
            } else {
                return response.json();
            }
        })
        .then((json) => {
            // Grab data from JSON.
            const userName = json.userName;
            var welcomeMsg = `Hello ${userName}, Welcome to ValueLabs app`;
            var greetMsg = new SimpleResponse({
                speech: `<speak>` + welcomeMsg  + `<break time="1" /> Would you like to check DCP orders or DO orders.</speak>`,
                text: welcomeMsg,
            });
            conv.ask(greetMsg);
            conv.add(new Suggestions('DCP Order details'));
            conv.add(new Suggestions('DO Order status'));
        });
}

app.intent('get order status', (conv, {title, order_type}) => {

    if ('accessToken' in conv.request.user) {
        const titlename = title;
        const titleordertype = order_type;
        var orderTypesArray = ["DO", "DCP"];

        if (orderTypesArray.indexOf(titleordertype.toUpperCase()) == -1) {
            const errorText = `<speak>Sorry! invalid order type provided, it must be a DO or DCP.<break time="1" /> What would you like to know next?<break time="1" /> DCP order status or DO order status?</speak>`;
            conv.ask(errorText);
            conv.add(new Suggestions('DCP Order details'));
            conv.add(new Suggestions('DO Order status'));
            return;
        }

        return fetch('https://php-backend-for-dialogflow.herokuapp.com/get_order_status.php?title=' + titlename + '&order_type=' + titleordertype + '&access_token=' + conv.request.user.accessToken)
            .then((response) => {
                if (response.status < 200 || response.status >= 300) {
                    throw new Error(response.statusText);
                } else {
                    return response.json();
                }
            })
            .then((json) => {
                // Grab data from JSON.
                if ('code' in json && json.code === 412)  {
                    conv.close(json.error_message);
                } else if ('error_message' in json) {
                    const errorText = `<speak>` + json.error_message + `<break time="1" /> What would you like to know next?<break time="1" /> DCP order status or DO order status?</speak>`;
                    conv.ask(new SimpleResponse({
                        speech: errorText,
                        text: json.error_message
                    }));
                    //conv.ask(json.error_message);
                    conv.add(new Suggestions('DCP Order details'));
                    conv.add(new Suggestions('DO Order status'));
                } else {
                    const outputText = `<speak>For the ${titlename}, <break time="1" />  \nTotal completed orders are ` + json.completed + `.  \n<break time="1" /> Total inprogress orders are ` + json.inprogress + `.  \n<break time="1" /> Total errored out orders are ` + json.error + `.<break time="1" /> What would you like to know next?<break time="1" /> DCP order status or DO order status? </speak>`;

                    conv.ask(new SimpleResponse({
                        speech: outputText,
                        text: `For the ${titlename},  \nTotal completed orders are ` + json.completed + `.  \nTotal inprogress orders are ` + json.inprogress + `.  \nTotal errored out orders are ` + json.error + `.`
                    }));
                    //conv.ask(outputText);
                    conv.ask(new BasicCard({
                        //title: "Main Title",
                        //subtitle: `${titlename}`,
                        //text: outputText,
                        image: new Image({
                            url: json.image_path,
                            alt: `${titlename}`,
                        }),
                        display: 'WHITE'
                    }));
                    conv.add(new Suggestions('DCP Order details'));
                    conv.add(new Suggestions('DO Order status'));
                }

            });
    } else {
        conv.ask(`Sorry! access_token not provided.`);
        return;
    }
});

restService.post('/v2/webhook', app) ;

restService.listen(process.env.PORT || 8000, function() {
  console.log("Server up and listening");
});

