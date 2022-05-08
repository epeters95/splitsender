const Pool = require('pg').Pool

// Development db

// const pool = new Pool({
//   user: 'erik',
//   host: 'localhost',
//   password: ,
//   database: 'splitstuff',
//   port: 5433,
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

const getUsers = (req, res) => {
  pool.query('SELECT * FROM users ORDER BY id ASC', (err, result) => {
    if (err) {
      return handleError(err, res);
    }
    res.render('users', { title: "Add User", users: result.rows });
  });
};



// const getUserGroups = (req, res) => {
// 	const id = parseInt(req.params.id);

// 	pool.query('SELECT * FROM groups WHERE user_id = $1 ORDER BY name ASC', [id], (err, result) => {
// 		if (err) {
// 			return handleError(err, res);
// 		}
// 		res.status(200).json(result.rows);
// 	});
// };

const getUserById = (req, res, userId, callback) => {
  const id = parseInt(userId);
  pool.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
    if (err) {
      return handleError(err, res);
    }
    var user = result.rows[0];
    callback(user);
  });
};

const updateUserState = (req, res, state, userId, callback) => {
  console.log("Updating user state for " + userId);
  pool.query(
    'UPDATE users SET state = $1 WHERE id = $2', [state, userId], (err, result) => {
      if (err) {
        return handleError(err, res);
      }
      callback(req, res, result);
    }
  );
};

const createUserToken = (req, res) => {
  var userId = req.params.id;
  var name = "access";
  var token  = req.body.access_token;
  console.log('Expires in ' + req.body.expires_in);
  pool.query(
    'INSERT INTO tokens (name, user_id, value) VALUES ($1, $2, $3)', [name, userId, token], (err, result) => {
      if (err) {
        return handleError(err, res);
      }
      res.redirect('../');;
    }
  );
};

const createUser = (req, res) => {
  var username = req.body.name.replace(/[^a-zA-Z]+/g, '');

  pool.query('INSERT INTO users (name) VALUES ($1)', [username], (err, result) => {
    if (err) {
      handleError(err, res);
    } else {
      console.log('User ' + username + ' added');
      pool.query('SELECT id FROM users WHERE name = $1', [username], (err2, result2) => {
        console.log(result2);
        redirectToLogin(req, res, result2.rows[0].id);
      })
    }
  });
}

const redirectToLogin = (req, res, userId) => {
  // Generate random state, save to db
  var state =  Math.random().toString().substr(2, 8);
  updateUserState(req, res, state, userId, (req, res, result) => {

    console.log('Redirecting with result ');
    console.log(result);
    // Redirect to login
    if (result !== undefined) {
      var redirectUri = 'https://shielded-inlet-79241.herokuapp.com/users/' + userId + '/auth';
      var urlParams =
        'response_type=code&' +
        'client_id=' + process.env.CLIENT_ID + '&' +
        'redirect_uri=' + encodeURIComponent(redirectUri) + '&' +
        'state=' + state + '';
      res.redirect('https://secure.splitwise.com/oauth/authorize?' + urlParams);
    } else {
      res.status(500);
    }
  });
}


const handleError = (err, res) => {
	console.error('Query execution', err.stack);
  res.render('error', {error: err, message: "Error"});
}

module.exports = {
  getUsers,
  getUserById,
  updateUserState,
  createUserToken,
  createUser,
  handleError
}