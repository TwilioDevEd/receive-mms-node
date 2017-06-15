const express = require('express');
const Twilio = require('twilio');
const extName = require('ext-name');
const urlUtil = require('url');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const config = require('../config');

const PUBLIC_DIR = './mms_images';
const { twilioPhoneNumber, twilioAccountSid, twilioAuthToken } = config;
const { MessagingResponse } = Twilio.twiml;
const { NODE_ENV } = process.env;

function MessagingRouter() {
  let twilioClient;
  let images = [];

  function getTwilioClient() {
    return twilioClient || new Twilio(twilioAccountSid, twilioAuthToken);
  }

  async function SaveFromUrl(url, filename) {
    if (NODE_ENV !== 'test') {
      fs.mkdirSync(path.resolve(PUBLIC_DIR));
      const response = await fetch(url);
      const fullPath = path.resolve(`${PUBLIC_DIR}/${filename}`);
      const fileStream = fs.createWriteStream(fullPath);

      response.body.pipe(fileStream);

      images.push(filename);
    }
  }

  function deleteMediaItem(mediaItem) {
    const client = getTwilioClient();

    return client
      .api.accounts(twilioAccountSid)
      .messages(mediaItem.MessageSid)
      .media(mediaItem.mediaSid).remove();
  }

  async function handleIncomingMMS(req, res) {
    const { body } = req;
    const { NumMedia, From: SenderNumber, MessageSid } = body;
    const saveOperations = [];
    const mediaItems = [];

    for (var i = 0; i < NumMedia; i++) {  // eslint-disable-line
      const mediaUrl = body[`MediaUrl${i}`];
      const contentType = body[`MediaContentType${i}`];
      const extension = extName.mime(contentType)[0].ext;
      const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
      const filename = `${mediaSid}.${extension}`;

      mediaItems.push({ mediaSid, MessageSid });

      saveOperations.push(SaveFromUrl(mediaUrl, filename));
    }

    await Promise.all(saveOperations);

    const deleteMediaItems = mediaItems.map(mediaItem => deleteMediaItem(mediaItem));
    await Promise.all(deleteMediaItems);

    const messageBody = NumMedia === 0 ?
    'Send us an image!' :
    `Thanks for sending us ${NumMedia} file(s)`;

    const response = new MessagingResponse();
    response.message({
      from: twilioPhoneNumber,
      to: SenderNumber,
    }, messageBody);

    return res.send(response.toString()).status(200);
  }


  function getRecentImages() {
    return images;
  }

  function clearRecentImages() {
    images = [];
  }

  function fetchRecentImages(req, res) {
    res.status(200).send(getRecentImages());
    clearRecentImages();
  }

  const router = express.Router();

  router.post('/incoming', handleIncomingMMS);

  router.get('/config', (req, res) => {
    res.status(200).send({ twilioPhoneNumber });
  });

  router.get('/images', fetchRecentImages);

  return router;
}

module.exports = {
  MessagingRouter,
};
