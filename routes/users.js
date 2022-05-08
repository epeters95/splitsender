var express = require('express');
var router = express.Router();
var https = require('https');
var db = require('../pool');

router.post('/', db.createUser);

/* Receive auth code */
router.get('/:id/auth', (req, res) => {
  db.getUserById(req, res, req.params.id, (user) => {
    var state = user.state;
    var rcvdState = req.query.state.toString();

    if (state === rcvdState) {
      sendAccessTokenRequest(req.query.code, user.id);
      console.log('Sweet!');
      res.redirect('../adduser');
    }
    else {
      console.log('Damn it :(');
      res.redirect('../');
    }
  });
});

/* Receive token */
router.post('/:id/token', db.createUserToken);

/* Utility functions */

const sendAccessTokenRequest = (authCode, userId) => {
  console.log("Attempting to request access token...");
  const redirectUri = 'https://shielded-inlet-79241.herokuapp.com/users/' + userId + '/token';
  const data = JSON.stringify({
    grant_type:    "authorization_code",
    code:          authCode,
    redirect_uri:  redirectUri,
    client_id:     process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  });
  var options = {
    hostname: 'secure.splitwise.com',
    port: 443,
    path: '/oauth/token/',
    method: 'POST',
    headers:{
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    console.log(`statusMessage: ${res.statusMessage}`);
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(data);
  req.end();
}



module.exports = router;