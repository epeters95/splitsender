const Pool = require('pg').Pool
const https = require('https');

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
  const query = 'SELECT u.name, t.value FROM users u ' +
                'LEFT JOIN tokens t ON u.id = t.user_id ' +
                'ORDER BY t.id DESC';
  pool.query(query, (err, result) => {
    if (err) {
      return handleError(err, res);
    }
    console.log(result.rows);
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

const editUser = (req, res) => {
  const username = req.params.name;
  getUserByName(req, res, username, (user) => {
    getUserGroups(req, res, user.id, (groups) => {
      res.render('edit_user', { groups: groups, user: user });
    });
  })
}

const getUserGroups = (req, res, userId, callback) => {
  pool.query('SELECT * FROM groups WHERE user_id = $1', [userId], (err, result) => {
    if (err) {
      handleError(err, res);
    } else {
      callback(result.rows);
    }
  });
}

// Used in GET /users/auth endpoint to get user specified in state
const getUserByName = (req, res, username, callback) => {
  const name = username.toString();
  pool.query('SELECT * FROM users WHERE name ILIKE $1', [name], (err, result) => {
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

const createUserToken = (token, userId, callback) => {
  var name = "access";
  console.log('Creating new user token for ' + userId);
  pool.query(
    'INSERT INTO tokens (name, user_id, value) VALUES ($1, $2, $3)', [name, userId, token], (err, result) => {
      if (err) {
        console.error('Query execution', err.stack);
      }
      console.log('Successfully created token');
      callback();
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
        redirectToLogin(req, res, result2.rows[0].id, username);
      })
    }
  });
}

const updateUserGroup = (req, res, userIdArg, groupIdArg) => {
  var userId = userIdArg;
  var groupId = groupIdArg;
  if (userId === undefined && groupId === undefined) {
    userId = req.params.id;
    groupId = req.body.group_id;
  }

  console.log("Updating user " + userId + ' with group ' + groupId);

  pool.query(
    'UPDATE users SET default_group_id = $1 WHERE id = $2', [groupId, userId], (err, result) => {
    if (err) {
      handleError(err, res);
    } else {
      res.redirect('../');
    }
  });
}

const createUserGroups = (res, userId, groups, callback) => {
  console.log('creating groups');
  groups.forEach((group, index) => {
    let i = index;
    pool.query(
      'INSERT INTO groups (sw_group_id, name, user_id) VALUES ($1, $2, $3)', [group.id, group.name, userId], (err, result) => {
      if (err) {
        handleError(err, res);
      } else if (i === groups.length - 1) {
        // Last group
        callback(res);
      }
    });
  })
}

const redirectToLogin = (req, res, userId, name) => {
  // Generate random state, save to db
  var state =  Math.random().toString().substr(2, 8);
  updateUserState(req, res, state, userId, (req, res, result) => {

    console.log('Redirecting with result ');
    // Redirect to login
    if (result !== undefined) {
      var redirectUri = 'https://shielded-inlet-79241.herokuapp.com/users/auth/' + userId;
      var urlParams =
        'response_type=code&' +
        'client_id=' + process.env.CLIENT_ID + '&' +
        'redirect_uri=' + redirectUri + '&' +
        'state=' + name + state + '';
      res.redirect('https://secure.splitwise.com/oauth/authorize?' + urlParams);
    } else {
      res.status(500);
    }
  });
}

const getUserAuthCode = (req, res, userId, callback) => {
  const id = parseInt(userId);
  const name = "access";
  // Get latest auth code
  pool.query('SELECT value FROM tokens WHERE user_id = $1 AND name = $2 ORDER BY id DESC LIMIT 1', [id, name], (err, result) => {
    if (err) {
      return handleError(err, res);
    }
    var authCode = result.rows[0];
    callback(authCode);
  });
}

const handleError = (err, res) => {
	console.error('Query execution', err.stack);
  res.render('error', {error: err, message: "Error"});
}

const sendApiCallBearer = (bearerKey, endpoint, method, data, callback) => {
  console.log("Attempting API call...");
  const bearerStr = 'Bearer ' + bearerKey;
  
  var options = {
    hostname: 'secure.splitwise.com',
    port: 443,
    path: '/api/v3.0/' + endpoint + '/',
    method: method,
    headers:{
        'Authorization': bearerStr
    }
  };
  if (method === 'POST') {
    options.headers = {
      'Authorization': bearerStr,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }
  const req = https.request(options, res => {
    callback(res);
  });

  req.on('error', error => {
    console.error(error);
  });

  if (method === 'POST') {
    req.write(data);
  }
  req.end();
};

module.exports = {
  getUsers,
  editUser,
  getUserByName,
  getUserGroups,
  updateUserState,
  createUserToken,
  createUser,
  updateUserGroup,
  createUserGroups,
  getUserAuthCode,
  handleError,
  sendApiCallBearer
}