/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');


//const recipes = require('./recipes');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const https = require('https');
const api_url = 'api.amazonalexa.com';
const api_port = '443';
// const {google} = require('googleapis');
// const TOKEN_PATH = 'token.json';
// const readline = require('readline');
//
// const fs = require('fs');
//
//
// const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];



const AWSregion = 'eu-west-1';

const AWS = require('aws-sdk');

AWS.config.update({
    region: AWSregion
});


/* INTENT HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state = "LAUNCH";

    //const item = requestAttributes.t(getRandomItem(Object.keys(recipes.RECIPE_EN_US)));

    const speakOutput = requestAttributes.t('WELCOME_MESSAGE', requestAttributes.t('SKILL_NAME'));
    const repromptOutput = requestAttributes.t('WELCOME_REPROMPT');

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    console.log("handlerInput", handlerInput);

    let permissions = ["write::alexa:household:list"];

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .withAskForPermissionsConsentCard(permissions)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    //const item = requestAttributes.t(getRandomItem(Object.keys(recipes.RECIPE_EN_US)));

    sessionAttributes.speakOutput = requestAttributes.t('HELP_MESSAGE');
    sessionAttributes.repromptSpeech = requestAttributes.t('HELP_REPROMPT');

    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  },
};

const RepeatHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent');
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state ="";
    const speakOutput = requestAttributes.t('STOP_MESSAGE');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    console.log("Inside SessionEndedRequestHandler");
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state ="";
    console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state ="";
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const ProblemHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'ProblemIntent');
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        //console.log("inside number handler");
        console.log("intent", handlerInput.requestEnvelope.request.intent);
        let problem = handlerInput.requestEnvelope.request.intent.slots.problem.value;
        sessionAttributes.problem = problem;

        let speakOutput="";

        if(sessionAttributes.state != "LAUNCH")
            speakOutput += requestAttributes.t('WELCOME_MESSAGE')+'<break time="0.5s"/>';

        sessionAttributes.state = "MEDICATION";

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            speakOutput += requestAttributes.t('MEDICATION');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();


    },
};

const YesHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent');
    },
    async handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const user = handlerInput.requestEnvelope.session.user;

        //console.log("inside number handler");
        console.log("intent", handlerInput.requestEnvelope.request.intent);
        console.log("state", sessionAttributes.state);
        let speakOutput;

        if(sessionAttributes.state == "MEDICATION"){
            speakOutput = requestAttributes.t('WHICH_MEDICATION');
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }

        if(sessionAttributes.state == "PROBLEMS"){
            sessionAttributes.state = "LOOK_DOC";
            speakOutput = requestAttributes.t('LOOK_DOC');
            // === https://developer.amazon.com/blogs/alexa/post/1e40c483-8050-41e1-99d4-8a34d49fee85/how-to-optimize-your-skill-for-every-alexa-enabled-device
            let cardTitle = 'Navigation';
            let cardBody  = 'Navigation to nearest doctor';
            let cardImage = 'https://s3.amazonaws.com/deepvoice/allcare.png';

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .withStandardCard(cardTitle, cardBody, cardImage)
                .reprompt(speakOutput)
                .getResponse();
        }

        if(sessionAttributes.state == "LOOK_DOC"){
            // inspired from https://medium.freecodecamp.org/how-to-create-an-alexa-skill-that-manages-to-do-lists-11c4bab29ea5
            let result = await bookAppointment(user);
            console.log("result", result);
            if(result){
                sessionAttributes.state="";
                speakOutput = requestAttributes.t("APPOINTMENT_NOT_ADDED")+'<break time="1s"/>'+ requestAttributes.t("THANK_YOU");
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                console.log("speakOutput",speakOutput);
                console.log("glob_handler",handlerInput);
            }
            else{
                sessionAttributes.state="";
                speakOutput = requestAttributes.t("APPOINTMENT_ADDED")+'<break time="1s"/>'+ requestAttributes.t("THANK_YOU");
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                console.log("speakOutput",speakOutput);
                console.log("glob_handler",handlerInput);
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        }
    },
};

async function bookAppointment(user){

    let path = "/v2/householdlists/";
    let timeStamp = Math.floor(Date.now() / 1000);
    let postData = {
        "name": "Appointment Added_"+timeStamp, //item value, with a string description up to 256 characters
        "state": "active" // item status (Enum: "active" only)
    };

    console.log("user",user);

    const consent_token = user.permissions.consentToken;

    let options = {
        host: api_url,
        port: api_port,
        path: path,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + consent_token,
            'Content-Type': 'application/json',
        }
    };
    let req = await https.request(options, (res) => {
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);
        let data = "";
        var bool;

        res.on('data', (d) => {
            console.log("data received:" + d);
            data += d;
        });
        res.on('error', (e) => {
            console.log("error received");
            console.error(e);
        });
        res.on('end', function() {
            console.log("ending post request");
            if (res.statusCode === 201) {
                var responseMsg = eval('(' + data + ')');
                console.log("new list id:" + responseMsg.listId);

                bool  = 1;
            } else {

                bool  = 0;
            }


        });
        if(bool)
            return 1;
        else
            return 0;
    });
    req.end(JSON.stringify(postData));
}

const NoHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        //console.log("inside number handler");
        console.log("intent", handlerInput.requestEnvelope.request.intent);
        console.log("state", sessionAttributes.state);
        let speakOutput;

        if(sessionAttributes.state == "MEDICATION"){
            sessionAttributes.state="";
            speakOutput = requestAttributes.t('STRESS')+'<break time="0.5s"/>'+requestAttributes.t('THANK_YOU');
        }

        if(sessionAttributes.state == "PROBLEMS"){
            sessionAttributes.state="";
            speakOutput = requestAttributes.t('STRESS')+'<break time="0.5s"/>'+requestAttributes.t('THANK_YOU');

        }
        if(sessionAttributes.state == "LOOK_DOC"){
            sessionAttributes.state="";
            speakOutput = requestAttributes.t('NO_TIME')+'<break time="0.5s"/>'+requestAttributes.t('THANK_YOU');

        }


        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();


    },
};

const MedicationHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'MedicationIntent');
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        //console.log("inside number handler");
        console.log("intent", handlerInput.requestEnvelope.request.intent);
        let medication = handlerInput.requestEnvelope.request.intent.slots.medication.value;
        let number = randomIntFromInterval(15,50);
        let symNum = randomIntFromInterval(0,1);
        let symptom = ['fever', 'joint pain']
        const speakOutput = requestAttributes.t("PROBLEMS", number, medication,symptom[symNum],symptom[symNum]);
        sessionAttributes.state = "PROBLEMS";
        //
        // // === https://developer.amazon.com/blogs/alexa/post/1e40c483-8050-41e1-99d4-8a34d49fee85/how-to-optimize-your-skill-for-every-alexa-enabled-device
        // let cardTitle = 'Navigation';
        // let cardBody  = 'Navigation to nearest doctor'
        // let cardImage = 'https://s3.amazonaws.com/deepvoice/allcare.png';

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.withStandardCard(cardTitle, cardBody, cardImage)
            .reprompt(speakOutput)
            .getResponse();

    },
};


/* CONSTANTS */
const skillBuilder = Alexa.SkillBuilders.standard();
const languageStrings = {
  en: {
    translation: {

      SKILL_NAME: 'medi buddy',
      WELCOME_MESSAGE: 'Welcome to AXA medi buddy. You can ask me about a symptom and then I can help you. So do you have a problem?',
      WELCOME_REPROMPT: 'Welcome to AXA medi buddy. How can I help you?',
      //DISPLAY_CARD_TITLE: '%s  - Recipe for %s.',
      HELP_MESSAGE: 'You can ask me about a side effect for an example',
      //HELP_REPROMPT: 'You can ask like <break time="1s"/> what is happening at two in the afteroon or <break time="1s"/> what is the event at two pm',
      HELP_REPROMPT: 'You can ask me about a side effect for an example',
      STOP_MESSAGE: 'Goodbye! Have a nice and healthy day',
      MEDICATION: "Are you on some medication?",
      WHICH_MEDICATION: "Which medication are you on?",
      PROBLEMS:"I see that %s people who were using %s also faced the same issue but they were also showing other side effects like %s too. Do you also have %s?",
      LOOK_DOC:'Showing you the route of doctor closer to your location<break time="2s"/> Do you want to book an appointment?',
      STRESS:'It may be because of the stress, wait until today and if the problem still persists, we can book an appointment for you tomorrow.',
      APPOINTMENT_ADDED: "Appointment added on to the list, have a look at it later." ,
      APPOINTMENT_NOT_ADDED: "Appointment not added due to some reason, have a look at it later",
      NO_TIME: "Oh okay, may be you dont have time today but please book it soon.",
      THANK_YOU:"Thank you. I hope that this helped you. And kindly recommend me to Hack Zurich participants"
    },
  },
  'en-US': {
    translation: {
      //RECIPES: recipes.RECIPE_EN_US,
      SKILL_NAME: 'medi buddy'
    },
  },
  'en-GB': {
    translation: {
      //RECIPES: recipes.RECIPE_EN_GB,
      SKILL_NAME: 'medi buddy'
    },
  }
};

// Finding the locale of the user
const LocalizationInterceptor = {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
      resources: languageStrings,
      returnObjects: true
    });

    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function (...args) {
      return localizationClient.t(...args);
    };
  },
};

function readDynamoItem(params, callback) {

    return new Promise((resolve, reject) =>{
        var docClient = new AWS.DynamoDB.DocumentClient();

        console.log('reading item from DynamoDB table');

        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("GetItem succeeded:", JSON.stringify(data, null, 2));

                resolve(data);  // this particular row has an attribute called message

            }
        });

    });
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}


// /**
//  * Create an OAuth2 client with the given credentials, and then execute the
//  * given callback function.
//  * @param {Object} credentials The authorization client credentials.
//  * @param {function} callback The callback to call with the authorized client.
//  */
// function authorize(callback) {
//     const oAuth2Client = new google.auth.OAuth2(
//         '354623003459-hciq2i2deepvo61rmaj4k1c1bjaff90h.apps.googleusercontent.com',
//         'jq-rtJ-x5l7kk3mDPI04ARlL', 'https://mynotificationsapp-80d1f.firebaseapp.com/__/auth/handler');
//
//     // Check if we have previously stored a token.
//     fs.readFile(TOKEN_PATH, (err, token) => {
//         if (err) return getAccessToken(oAuth2Client, callback);
//         oAuth2Client.setCredentials();
//         callback(oAuth2Client);
//     });
// }
//
// /**
//  * Get and store new token after prompting for user authorization, and then
//  * execute the given callback with the authorized OAuth2 client.
//  * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
//  * @param {getEventsCallback} callback The callback for the authorized client.
//  */
// function getAccessToken(oAuth2Client, callback) {
//     const authUrl = oAuth2Client.generateAuthUrl({
//         access_type: 'offline',
//         scope: SCOPES,
//     });
//     console.log('Authorize this app by visiting this url:', authUrl);
//     const rl = readline.createInterface({
//         input: process.stdin,
//         output: process.stdout,
//     });
//     rl.question('Enter the code from that page here: ', (code) => {
//         rl.close();
//         oAuth2Client.getToken(code, (err, token) => {
//             if (err) return console.error('Error retrieving access token', err);
//             oAuth2Client.setCredentials(token);
//             // Store the token to disk for later program executions
//             fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
//                 if (err) console.error(err);
//                 console.log('Token stored to', TOKEN_PATH);
//             });
//             callback(oAuth2Client);
//         });
//     });
// }

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
    const calendar = google.calendar({version: 'v3', auth});
    calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const events = res.data.items;
        if (events.length) {
            console.log('Upcoming 10 events:');
            events.map((event, i) => {
                const start = event.start.dateTime || event.start.date;
                console.log(`${start} - ${event.summary}`);
            });
        } else {
            console.log('No upcoming events found.');

        }
    });
}

/* LAMBDA SETUP */
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler,
    ProblemHandler,
    YesHandler,
    NoHandler,
    MedicationHandler
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();
