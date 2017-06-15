const config = require('./config');
const Twilio = require('twilio');

const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = config;
const client = new Twilio(twilioAccountSid, twilioAuthToken);

client.messages.create({
  to: twilioPhoneNumber,
  from: twilioPhoneNumber,
  body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
  mediaUrl: 'https://c1.staticflickr.com/3/2899/14341091933_1e92e62d12_b.jpg',
})
.done();
