var express = require('express');
var ObjectId = require('mongodb').ObjectId;
const Product = require('../models/Product');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.session.loggedIn) {
    res.redirect('/products');
    res.end();
  } else {
    res.render('login', { title: 'Login' });
  }
});

//GET Signup Page
router.get('/signup', function (req, res, next) {
  if (req.session.loggedIn) {
    res.redirect('/');
    res.end();
  } else {
    res.render('register', { title: 'Register' });
  }
});

//GET Profile Page
router.get('/profile', function (req, res, next) {
  if (!req.session.loggedIn) {
    res.redirect('/');
    res.end();
  } else {
    const user = {
      username: req.session.username,
      name: req.session.name,
      _id: req.session._id
    }
    Product.find({ uid: new ObjectId(user._id) })
      .populate('bidders.bidder')
      .exec((err, products) => {
        if (err) {
          return res.send("Err");
        }
        res.render('profile', {
          title: 'Register',
          user,
          products
        });
      });
  }
});

module.exports = router;
