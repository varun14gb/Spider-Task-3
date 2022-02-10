var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.session.loggedIn) {
    res.render('index', { title: 'Express' });
    res.end();
  } else {
    res.render('index', { title: 'Login First' });
  }
});

module.exports = router;
