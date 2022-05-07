var express = require('express');
var router = express.Router();
var https = require('https');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: "Expensi" });
});

/* Receive webhook */
router.post('/send', function(req, res) {
  var intentStr = req.body.intent.query.toLowerCase();
  // var user = (intentStr.includes("enfa") === false ? process.env.ERIK_ID : process.env.ENFA_ID);

  var amt = parseFloat(req.body.session.params.amt).toFixed(2);
  var desc = req.body.session.params.desc.toString();

  sendApiCall(amt, desc);
  
  // res.render('index', { title: "Expense  added", body: req.body });
  res.status(200).end();
});

function sendApiCall(amt, desc) {
  console.log("Attempting API call...");
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
