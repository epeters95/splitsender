var express = require('express');
var router = express.Router();
var https = require('https');
var db = require('../pool');

/* GET pages */
router.get('/', function(req, res, next) {
  res.render('index', { title: "Expensi" });
});

router.get('/adduser', db.getUsers);


/* Receive webhook */
router.post('/send', function(req, res) {
  var intentStr = req.body.intent.query.toLowerCase();

  var amt = parseFloat(req.body.session.params.amt).toFixed(2);
  var desc = req.body.session.params.desc.toString();
  var username = req.body.session.params.username.toString().toLowerCase().replace('eric', 'erik');

  db.getUserByName(req, res, username, (user) => {

    if (user === undefined) {
      // User hasn't been created yet
      res.status(500);
    } else {
      const data = JSON.stringify({
        cost:          amt,
        description:   desc,
        currency_code: 'USD',
        group_id:      user.default_group,
        split_equally: true
      });
      // Get user token
      db.getUserAuthCode(req, res, user.id, (authCode) => {
        db.sendApiCallBearer(authCode, 'create_expense', 'POST', data, (response) => {
          console.log(`statusCode: ${response.statusCode}`);
          console.log(`statusMessage: ${response.statusMessage}`);
        });
        
        // res.render('index', { title: "Expense  added", body: req.body });
        res.status(200).end();
      })

    }

  });
});



module.exports = router;
