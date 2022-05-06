var express = require('express');
var router = express.Router();
var https = require('https');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: "Expensi" });
});

/* E.g. /send?amt=8&desc=Parking%20at%20U%20of%20A&enfa=false */
router.post('/send', function(req, res) {
  console.log("Attempting API call...");

  // var user_id = (req.query.enfa === "true" ? process.env.ERIK_ID : process.env.ENFA_ID);
  console.log(req.body);
  // sendApiCall(req.query.amt, req.query.desc, user_id);
  
  // res.render('index', { title: "Expense  added", body: req.body });
  res.status(200).end();
});

function sendApiCall(amt, desc, user_id) {
  const bearerStr = 'Bearer ' + process.env.PERSONAL_KEY;
  const data = JSON.stringify({
    cost:          amt,
    description:   desc,
    currency_code: 'USD',
    group_id:      process.env.GROUP_ID,
    split_equally: true
  });
  var options = {
    hostname: 'secure.splitwise.com',
    port: 443,
    path: '/api/v3.0/create_expense/',
    method: 'POST',
    headers:{
        'Authorization': bearerStr,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
  };
  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    console.log(`statusMessage: ${res.statusMessage}`);
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(data);
  req.end();
};

module.exports = router;
