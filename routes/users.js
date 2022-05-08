var express = require('express');
var router = express.Router();
var https = require('https');
var db = require('../pool');

router.post('/', db.createUser);

/* Receive auth code */
router.get('/auth', (req, res) => {
  console.log('Now in auth');
  var rcvdState = req.query.state.toString();
  var username = rcvdState.replace(/[^a-zA-Z]+/g, '');
  console.log("Username: " + username);
  db.getUserByName(req, res, username, (user) => {
    var state = user.state;

    if (user.name + state === rcvdState) {
      sendAccessTokenRequest(req.query.code, user.id);
      res.redirect('../../adduser');
    }
    else {
      console.log('State not matched.');
      res.redirect('../');
    }
  });
});

/* Utility functions */

const sendAccessTokenRequest = (authCode, userId) => {
  console.log("Requesting access token...");
  const redirectUri = 'https://shielded-inlet-79241.herokuapp.com/users/auth/';
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
    res.setEncoding('utf8');

    // Token should come in single chunk
    res.on('data', (chunk) => {
      let body = chunk;
      try {
        const data = JSON.parse(body);
        var token = data.access_token.toString();
        db.createUserToken(token, userId);
      } catch (err) {
        console.log('Error: ' + err.message);
      }
    });
  });
}



module.exports = router;