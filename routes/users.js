var express = require('express');
var bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const Product = require('../models/Product');
var ObjectId = require('mongodb').ObjectId;
var multer = require('multer');
var upload = multer();
var router = express.Router();

router.use(upload.array());

// GET users listing
router.get('/', async (req, res, next) => {
  try {
    const users = await User.aggregate([
      { $project: { password: 0 } }
    ]);
    if (!users) {
      return res.status(404).render('error', {
        error: {
          status: '404',
          message: 'Not Found'
        }
      });
    }
    res.render('users', {
      title: 'Users',
      users
    });
  } catch (error) {
    return res.status(500).render('error', {
      error: {
        status: '500',
        message: 'Oops!'
      }
    });
  }
});

// POST Registeration Information
router.post('/register', [

  check('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be 6 characters long at least!'),

  check('confirmPassword')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be 6 characters long at least!')
    .custom((confirmPassword, { req }) => {
      if (confirmPassword != req.body.password) {
        throw new Error('Passwords must match!');
      }
      return true;
    }),

  check('username')
    .trim()
    .custom(async (username) => {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('Username already in use');
      }
      return true;
    })

], function (req, res, next) {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('register', {
      title: "Register",
      errors: errors.errors
    });
  }

  User.create({
    username: req.body.username,
    password: bcrypt.hashSync(req.body.password, 10),
    about: req.body.about,
    name: req.body.name
  }, (err, data) => {
    if (err) {
      return res.status(500).render('error', {
        error: {
          status: '500',
          message: 'Something Wrong'
        }
      });
    } else {
      res.redirect('/');
    }
  });

});

// POST Login Information
router.post('/login', [

  check('username')
    .trim()
    .custom(async (username) => {
      const existingUser = await User.findOne({ username });
      if (!existingUser) {
        throw new Error('Username does not exist');
      }
      return true;
    }),

  check('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be 6 characters long at least!')
    .custom(async (password, { req, res }) => {
      const username = req.body.username;
      const existingUser = await User.findOne({ username });
      if (!existingUser) {
        throw new Error('Username does not exist');
      }
      var isValid = await bcrypt.compare(password, existingUser.password);
      if (!isValid) {
        throw new Error('Invalid Password');
      }
      req.body["name"] = existingUser.name;
      req.body["id"] = existingUser._id;
      return true;
    }),

], function (req, res, next) {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('login', {
      title: "Login",
      errors: errors.errors
    });
  }
  req.session.loggedIn = true;
  req.session.username = req.body.username;
  req.session.name = req.body.name;
  req.session._id = req.body.id;
  res.redirect('/');
});

// DELETE Logout the user
router.get('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    return res.status(500).render('error', {
      error: {
        status: '500',
        message: 'Something Wrong'
      }
    });
  })
  res.redirect('/');
})

// GET a User's Information
router.get('/:userid', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.userid });
    if (!user) {
      return res.status(404).render('error', {
        error: {
          status: '404',
          message: 'Not Found'
        }
      });
    }
    user.password = null;
    const biddedOnProducts = await Product.find({ bidders: { $elemMatch: { bidder: new ObjectId(user._id) } } })
      .populate('uid')
      .populate('bidders.bidder');
    Product.find({ uid: new ObjectId(user._id) })
      .populate('bidders.bidder')
      .exec((err, products) => {
        if (err) {
          return res.status(500).render('error', {
            error: {
              status: '500',
              message: 'Something Wrong'
            }
          });
        }
        res.render('user', {
          title: 'User Profile',
          user,
          products,
          biddedOnProducts
        });
      });
  } catch (error) {
    return res.status(500).render('error', {
      error: {
        status: '500',
        message: 'Something Wrong'
      }
    });
  }
});

module.exports = router;
