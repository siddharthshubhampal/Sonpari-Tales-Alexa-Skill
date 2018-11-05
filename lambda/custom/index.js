/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */

const Alexa = require('ask-sdk');

const SKILL_NAME = 'Fairy tales';
const FALLBACK_MESSAGE_DURING_GAME = `I can't help you with that. Try saying yes or no `;
const FALLBACK_REPROMPT_DURING_GAME = 'say yes or no';
const FALLBACK_MESSAGE_OUTSIDE_GAME = `I can't help you with that. Try saying yes or no`;
const FALLBACK_REPROMPT_OUTSIDE_GAME = 'Say yes to start or no to quit.';

var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-east-1",
});

var myDate = new Date();
var current_date = myDate.getUTCDate().toString()+'/'+myDate.getUTCMonth()+'/'+myDate.getUTCFullYear().toString();


const LaunchRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.session.new || handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    var attributesManager = handlerInput.attributesManager;
    var responseBuilder = handlerInput.responseBuilder;
    var speechOutput="Welcome, I am sonpari. I tell new stories everyday to <emphasis level='reduced'>good children</emphasis>. I'll ask you a question to check whether you a good kid or not. Are you ready?";
    var reprompt='say yes to start and no to exit';
    var attributes = await attributesManager.getPersistentAttributes() || {};
    if (Object.keys(attributes).length === 0) {
      attributes.endedSessionCount = 0;
      attributes.gamesPlayed = 1;
      attributes.gameState = 'ENDED';
      attributes.lessonState = 'ENDED';
      attributes.StoryState = 'ENDED';
      attributes.answer_no = '';
      attributes.answer_yes = '';
      attributes.content = '';
      attributes.story_content ='';
      attributes.quesion_speech='';
      attributes.last_date="20/9/2018";
      attributes.repeating= 'false';
      attributes.question_type = '';
      attributes.user_reply_promise_check = 'false';
    }
    attributesManager.setPersistentAttributes(attributes);
    await attributesManager.savePersistentAttributes(attributes);

    console.log('current date: '+current_date );
    if (attributes.last_date != current_date){
      attributes.gamesPlayed += 1;
    }
    if (attributes.endedSessionCount > 0 || attributes.gamesPlayed >2){
      speechOutput='Welcome back! Are you ready for todays lesson?';
    }
    if (attributes.last_date === current_date){
      speechOutput='Welcome back! You need to come tomorrow for new story. do you want to listen todays story again?';
      attributes.repeating='true';
    }
    // attributesManager.setSessionAttributes(attributes);
    // const sessionAttributes = attributesManager.getSessionAttributes();
    var docClient2 = new AWS.DynamoDB.DocumentClient();
    var table = "stories";
    var params = {
          TableName : "stories",
          ProjectionExpression:"#id, info.answer_no, info.answer_yes,info.content,info.quesion_speech,info.story_content,info.question_type",
          KeyConditionExpression: "#id = :yyyy",
          ExpressionAttributeNames:{
              "#id": "S_id"
          },
          ExpressionAttributeValues: {
              ":yyyy": attributes.gamesPlayed
          }
        };
    docClient2.query(params, function(err, data) {
    if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Query succeeded.");
        console.log(data);
        console.log(data.Items);
        data.Items.forEach( async function(item) {
            attributes = await attributesManager.getPersistentAttributes();
            attributes.answer_no = item.info.answer_no;
            attributes.answer_yes = item.info.answer_yes;
            attributes.content = item.info.content;
            attributes.story_content = item.info.story_content;
            attributes.quesion_speech = item.info.quesion_speech;
            attributes.question_type = item.info.question_type;
            handlerInput.attributesManager.setPersistentAttributes(attributes);
            handlerInput.attributesManager.setSessionAttributes(attributes);
            await attributesManager.savePersistentAttributes();
            console.log('here are attributes: '+JSON.stringify(attributes, null, 2));
        });
    }
    });
    
        console.log("here are the final attributes: "+ JSON.stringify(attributes, null, 2));
        handlerInput.attributesManager.setSessionAttributes(attributes);
        // var sessionAttributes = await attributesManager.getPersistentAttributes();
        // attributesManager.setSessionAttributes(sessionAttributes);
        return responseBuilder
          .speak(speechOutput)
          .reprompt(reprompt)
          .getResponse();
   
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  async handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const responseBuilder = handlerInput.responseBuilder;
    var sessionAttributes = attributesManager.getSessionAttributes();
    if (sessionAttributes.gameState==='ENDED' && sessionAttributes.lessonState === 'ENDED' && sessionAttributes.StoryState === 'ENDED'){
      if (sessionAttributes.repeating === 'false'){
      sessionAttributes.gamesPlayed -= 1;
      }
      sessionAttributes.repeating = 'false'
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      return handlerInput.responseBuilder
      .speak('Ok, see you tomorrow. bye!')
      .getResponse();
    }else if (sessionAttributes.gameState==='STARTED' && sessionAttributes.lessonState === 'ENDED' && sessionAttributes.StoryState === 'ENDED'){
      sessionAttributes.gameState='ENDED';
      sessionAttributes.repeating='false';
      sessionAttributes.endedSessionCount +=1 ;
      sessionAttributes.user_reply_promise_check = "false";
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      return handlerInput.responseBuilder
      .speak('Ok, see you tomorrow. bye!')
      .getResponse();
    }else if (sessionAttributes.gameState==='STARTED' && sessionAttributes.lessonState === 'STARTED' && sessionAttributes.StoryState === 'ENDED'){
      return handlerInput.responseBuilder
      .speak('Ok, see you tomorrow. bye!')
      .getResponse();
    }
    return handlerInput.responseBuilder
      .speak('Ok, see you tomorrow. bye!')
      .getResponse();
  },
};

const SessionEndedRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const HelpIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {1
    const speechOutput = 'I am sonpari. I tell stories only to good children. Say yes to proceed and no to exit';
    const reprompt = 'Say yes to proceed and no to exit';

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(reprompt)
      .getResponse();
  },
};

const YesIntent = {
  canHandle(handlerInput) {
    // only start a new game if yes is said when not playing a game.

    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && (request.intent.name === 'AMAZON.YesIntent' || request.intent.name === 'PromiseIntent');
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributesManager = handlerInput.attributesManager;
    const responseBuilder = handlerInput.responseBuilder;
    const sessionAttributes = attributesManager.getSessionAttributes();

    if (sessionAttributes.gameState==='ENDED' && sessionAttributes.lessonState === 'ENDED' && sessionAttributes.StoryState === 'ENDED' && request.intent.name === 'AMAZON.YesIntent'){
      var attributes = await attributesManager.getPersistentAttributes()
      attributes.gameState = 'STARTED';
      attributes.last_date = current_date;
      attributesManager.setSessionAttributes(attributes);
      return responseBuilder
      .speak(attributes.quesion_speech)
      .reprompt('say yes or no to continue.')
      .getResponse();
    }else if (sessionAttributes.gameState==='STARTED' && sessionAttributes.lessonState === 'ENDED' && sessionAttributes.StoryState === 'ENDED' && request.intent.name === 'AMAZON.YesIntent'){
      sessionAttributes.lessonState = 'STARTED';
      sessionAttributes.user_reply_promise_check = "true";
      return responseBuilder
      .speak(sessionAttributes.answer_yes)
      .reprompt('say yes or no to continue.')
      .getResponse();
    }else if (sessionAttributes.gameState==='STARTED' && sessionAttributes.lessonState === 'STARTED' && sessionAttributes.StoryState === 'ENDED' && (request.intent.name === 'AMAZON.YesIntent' || (request.intent.name === 'PromiseIntent' && sessionAttributes.question_type === 'Promise' && sessionAttributes.user_reply_promise_check === "true"))){
      sessionAttributes.lessonState = 'ENDED'
      sessionAttributes.gameState = 'ENDED'
      sessionAttributes.StoryState = 'ENDED'
      sessionAttributes.repeating = 'false';
      sessionAttributes.user_reply_promise_check = "false";
      attributesManager.setSessionAttributes.lessonState ='ENDED'
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      return responseBuilder
      .speak(sessionAttributes.story_content)
      .getResponse();
    }
    return handlerInput.responseBuilder
      .speak('Sorry, I didn\'t get that. Try saying yes or no.')
      .reprompt('Try saying yes or no.')
      .getResponse();
  },
};

const NoIntent = {
  canHandle(handlerInput) {
    
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NoIntent';
  },
  async handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const responseBuilder = handlerInput.responseBuilder;
    const sessionAttributes = attributesManager.getSessionAttributes();


    if (sessionAttributes.gameState==='ENDED' && sessionAttributes.lessonState === 'ENDED' && sessionAttributes.StoryState === 'ENDED'){
      if (sessionAttributes.repeating === 'false'){
      sessionAttributes.gamesPlayed -= 1;
      }
      sessionAttributes.endedSessionCount += 1;
      sessionAttributes.gameState = 'ENDED';
      sessionAttributes.repeating = 'false';
      sessionAttributes.user_reply_promise_check = "false";
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      return responseBuilder.speak('Ok, see you next time. bye!').getResponse();

    }else if (sessionAttributes.gameState==='STARTED' && sessionAttributes.lessonState === 'ENDED' && sessionAttributes.StoryState === 'ENDED'){
      sessionAttributes.lessonState = 'STARTED';
      return responseBuilder
      .speak(sessionAttributes.answer_no)
      .reprompt('say yes or no to continue.')
      .getResponse();
    }else if (sessionAttributes.gameState==='STARTED' && sessionAttributes.lessonState === 'STARTED' && sessionAttributes.StoryState === 'ENDED'){
      sessionAttributes.endedSessionCount += 1;
      sessionAttributes.gameState = 'ENDED';
      sessionAttributes.lessonState = 'ENDED';
      sessionAttributes.repeating = 'false';
      sessionAttributes.user_reply_promise_check = "false";
      await attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
      return responseBuilder.speak('Ok, see you next time. bye!').getResponse();
    }
    return handlerInput.responseBuilder
      .speak('Sorry, I didn\'t get that. Try saying yes or no.')
      .reprompt('Try saying yes or no.')
      .getResponse();
  },
};

const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    const outputSpeech = 'Say yes to continue, or no to exit';
    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .reprompt(outputSpeech)
      .getResponse();
  },
};

// const NumberGuessIntent = {
//   canHandle(handlerInput) {
//     // handle numbers only during a game
//     let isCurrentlyPlaying = false;
//     const request = handlerInput.requestEnvelope.request;
//     const attributesManager = handlerInput.attributesManager;
//     const sessionAttributes = attributesManager.getSessionAttributes();

//     if (sessionAttributes.gameState &&
//         sessionAttributes.gameState === 'STARTED') {
//       isCurrentlyPlaying = true;
//     }

//     return isCurrentlyPlaying && request.type === 'IntentRequest' && request.intent.name === 'NumberGuessIntent';
//   },
//   async handle(handlerInput) {
//     const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;

//     const guessNum = parseInt(requestEnvelope.request.intent.slots.number.value, 10);
//     const sessionAttributes = attributesManager.getSessionAttributes();
//     const targetNum = sessionAttributes.guessNumber;

//     if (guessNum > targetNum) {
//       return responseBuilder
//         .speak(`${guessNum.toString()} is too high.`)
//         .reprompt('Try saying a smaller number.')
//         .getResponse();
//     } else if (guessNum < targetNum) {
//       return responseBuilder
//         .speak(`${guessNum.toString()} is too low.`)
//         .reprompt('Try saying a larger number.')
//         .getResponse();
//     } else if (guessNum === targetNum) {
//       sessionAttributes.gamesPlayed += 1;
//       sessionAttributes.gameState = 'ENDED';
//       attributesManager.setPersistentAttributes(sessionAttributes);
//       await attributesManager.savePersistentAttributes();
//       return responseBuilder
//         .speak(`${guessNum.toString()} is correct! Would you like to play a new game?`)
//         .reprompt('Say yes to start a new game, or no to end the game.')
//         .getResponse();
//     }
//     return handlerInput.responseBuilder
//       .speak('Sorry, I didn\'t get that. Try saying a number.')
//       .reprompt('Try saying a number.')
//       .getResponse();
//   },
// };

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const FallbackHandler = {
  // 2018-May-01: AMAZON.FallackIntent is only currently available in en-US locale.
  //              This handler will not be triggered except in that locale, so it can be
  //              safely deployed for any locale.
  canHandle(handlerInput) {
    // handle fallback intent, yes and no when playing a game
    // for yes and no, will only get here if and not caught by the normal intent handler
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.FallbackIntent' ||
       request.intent.name === 'AMAZON.YesIntent' ||
       request.intent.name === 'AMAZON.NoIntent');
  },
  handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();

    if (sessionAttributes.gameState &&
        sessionAttributes.gameState === 'STARTED') {
      // currently playing

      return handlerInput.responseBuilder
        .speak(FALLBACK_MESSAGE_DURING_GAME)
        .reprompt(FALLBACK_REPROMPT_DURING_GAME)
        .getResponse();
    }

    // not playing
    return handlerInput.responseBuilder
      .speak(FALLBACK_MESSAGE_OUTSIDE_GAME)
      .reprompt(FALLBACK_REPROMPT_OUTSIDE_GAME)
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequest,
    ExitHandler,
    SessionEndedRequest,
    HelpIntent,
    YesIntent,
    NoIntent,
    FallbackHandler,
    UnhandledIntent,
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('High-Low-Game')
  .withAutoCreateTable(true)
  .lambda();