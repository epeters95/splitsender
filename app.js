var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/* E.g. /send?amt=8&desc=Parking%20at%20U%20of%20A&enfa=false */
app.post('/send', function(req, res) {
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

module.exports = app;
