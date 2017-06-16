const express = require('express');
const Twilio = require('twilio');
const extName = require('ext-name');
const urlUtil = require('url');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const config = require('../config');

const PUBLIC_DIR = './public/mms_images';
const { twilioPhoneNumber, twilioAccountSid, twilioAuthToken } = config;
const { MessagingResponse } = Twilio.twiml;
const { NODE_ENV } = process.env;

function MessagingRouter() {
  let twilioClient;
  let images = [];

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(path.resolve(PUBLIC_DIR));
  }

  function getTwilioClient() {
    return twilioClient || new Twilio(twilioAccountSid, twilioAuthToken);
  }

  function deleteMediaItem(mediaItem) {
    const client = getTwilioClient();

    return client
      .api.accounts(twilioAccountSid)
      .messages(mediaItem.MessageSid)
      .media(mediaItem.mediaSid).remove();
  }

  async function SaveMedia(mediaItem) {
    const { mediaUrl, filename } = mediaItem;
    if (NODE_ENV !== 'test') {
      const fullPath = path.resolve(`${PUBLIC_DIR}/${filename}`);

      if (!fs.existsSync(fullPath)) {
        const response = await fetch(mediaUrl);
        const fileStream = fs.createWriteStream(fullPath);

        response.body.pipe(fileStream);

        deleteMediaItem(mediaItem);
      }

      images.push(filename);
    }
  }


  async function handleIncomingSMS(req, res) {
    const { body } = req;
    const { NumMedia, From: SenderNumber, MessageSid } = body;
    let saveOperations = [];
    const mediaItems = [];

    for (var i = 0; i < NumMedia; i++) {  // eslint-disable-line
      const mediaUrl = body[`MediaUrl${i}`];
      const contentType = body[`MediaContentType${i}`];
      const extension = extName.mime(contentType)[0].ext;
      const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
      const filename = `${mediaSid}.${extension}`;

      mediaItems.push({ mediaSid, MessageSid, mediaUrl, filename });
      saveOperations = mediaItems.map(mediaItem => SaveMedia(mediaItem));
    }

    await Promise.all(saveOperations);

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

  /**
   * Initialize router and define routes.
   */
  const router = express.Router();
  router.post('/incoming', handleIncomingSMS);
  router.get('/config', (req, res) => {
    res.status(200).send({ twilioPhoneNumber });
  });
  router.get('/images', fetchRecentImages);

  return router;
}

module.exports = {
  MessagingRouter,
};
