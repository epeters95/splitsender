var express = require('express');
var router = express.Router();
var https = require('https');
var db = require('../pool');

router.post('/', db.createUser);

router.post('/update/:id', db.updateUserGroup);

router.get('/edit/:name', db.editUser);

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

  // Send request for Access token
  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      const body = JSON.parse(chunk);

      db.createUserToken(body.access_token, userId, () => {
        // With access token, get the current user info including groups and save it
        db.sendApiCallBearer(body.access_token, 'get_groups', 'GET', {}, (response) => {
          console.log("Trying to get some groups");
          var chunkStr = '';
          response.on('data', (groupsData) => {
              chunkStr += groupsData;
          });

          response.on('end',function(){
            const body2 = JSON.parse(chunkStr);
            console.log(body2);
            var groups = [];
            body2.groups.filter(v => v.id !== 0).forEach(group => {
              groups.push({id: group.id, name: group.name});
            });
            // Save groups
            // Set user default group
            db.createUserGroups(res, userId, groups, (res2) => {
              console.log('Groups created, setting default...');
              db.updateUserGroup({}, res2, userId, groups[0].id)
            });
          });
        });
      });
    });
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(data);
  req.end();
}



module.exports = router;