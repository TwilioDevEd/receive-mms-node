const supertest = require('supertest');
const mockery = require('mockery-partial');
const Twilio = require('twilio');
const incomingMMS = require('./fixtures/IncomingMMS');
const config = require('../config');

const { twilioPhoneNumber } = config;

describe('appointment', () => {
  let agent;
  function TwilioMock() {
    return {
      api: {
        accounts() {
          return {
            messages() {
              return {
                media() {
                  return {
                    remove() {},
                  };
                },
              };
            },
          };
        },
      },
    };
  }

  before(() => {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
    });
  });

  beforeEach(() => {
    TwilioMock.twiml = Twilio.twiml;
    mockery.registerMock('twilio', TwilioMock);
    const app = require('../app.js');
    agent = supertest(app);
  });


  describe('POST /incoming', () => {
    it('responds to incoming messages', () => {
      return agent.post('/incoming')
        .send(incomingMMS)
        .expect(200)
        .expect('<?xml version="1.0" encoding="UTF-8"?><Response>' +
                '<Message from="+1707XXXXXXX" to="+1707XXXXXXX">' +
                'Thanks for sending us 1 file(s)</Message></Response>');
    });
  });

  describe('GET /config', () => {
    it('retrieves the twilio number from the environment config', () => {
      return agent.get('/config')
        .expect(200)
        .expect({ twilioPhoneNumber });
    });
  });

  describe('GET /images', () => {
    it('retrieves images receieved via mms', () => {
      return agent.get('/images')
        .expect(200)
        .expect([]);
    });
  });
});
