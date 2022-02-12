var express = require('express');
const { check, validationResult } = require('express-validator');
const Product = require('../models/Product');
var ObjectId = require('mongodb').ObjectId;
const User = require('../models/User');
const createError = require('http-errors');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
const { profile } = require('console');
const res = require('express/lib/response');
const req = require('express/lib/request');
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage });
var router = express.Router();

// router.use(upload.array());

// GET Products List
router.get('/', function (req, res, next) {
    Product.find({})
        .populate({ path: 'uid', select: '-password' })
        .populate({ path: 'bidders.bidder', select: '-password' })
        .exec((err, products) => {
            if (err) {
                res.send(error);
            } else {
                console.log(products[1].bidders.sort((a, b) => (a.bid > b.bid) ? -1 : ((b.bid > a.bid) ? 1 :
                    0))[0].bidder.username);
                res.render('products', {
                    title: 'Products',
                    products
                });
            }
        })
});

// POST a Product
router.post('/', upload.single('image'), function (req, res, next) {
    var obj = {
        uid: req.session._id,
        title: req.body.title,
        tags: req.body.tags.split(' '),
        time: new Date(req.body.time),
        img: {
            data: fs.readFileSync(path.join(__dirname.slice(0, -7) + '/uploads/' + req.file.filename)),
            contentType: req.file.mimetype
        }
    }
    Product.create(obj, (err, product) => {
        if (err) {
            return res.send("error");
        }
        res.render('product', {
            title: product.title,
            product
        });
    })
});

// GET Product Upload Page
router.get('/add', function (req, res, next) {
    res.render('addproduct', { title: 'Add Product' });
});

// GET a Product Information
router.get('/:productid', async (req, res, next) => {
    const product = await Product.findOne({ _id: new ObjectId(req.params.productid) })
        .populate({ path: 'uid', select: '-password' })
        .populate({ path: 'bidders.bidder', select: '-password' });
    if (!product) {
        next(createError(404));
    }
    product.bidders.sort((a, b) => (a.bid > b.bid) ? -1 : ((b.bid > a.bid) ? 1 : 0));
    res.render('product', {
        title: product.title,
        product
    });
});

// GET Product Edit Page
router.get('/edit/:productid', function (req, res, next) {
    Product.findOne({ _id: new ObjectId(req.params.productid) }, (err, product) => {
        console.log(req.params.productid)
        if (err) {
            return res.send("Error");
        }
        if (product.uid.toString() != req.session._id) {
            return res.send("Not Authorized");
        }
        product.tags = product.tags.join(" ");
        res.render('updateProduct', {
            title: product.title,
            product
        });
    });
});

// POST Update Product's detail
router.post('/edit/:productid', upload.array(), (req, res, next) => {
    Product.findOneAndUpdate({ _id: new ObjectId(req.params.productid) }, {
        uid: req.session._id,
        title: req.body.title,
        about: req.body.about,
        tags: req.body.tags.split(' '),
        time: new Date(req.body.time)
    }, (err, product) => {
        if (err) {
            return res.send("Error");
        }
        if (product.uid != req.session._id) {
            return res.send("Not Authorized");
        }
        res.redirect('/products/' + req.params.productid);
    });
});

// POST Delete a Product
router.post('/delete/:productid', function (req, res, next) {
    Product.deleteOne({ _id: new ObjectId(req.params.productid) }, (err, pr) => {
        if (err) {
            console.log(err);
            return res.send("Some Error");
        }
    })
    res.send('Deleted');
});

// POST Bidding on a Product
router.post('/bid/:productid', function (req, res, next) {
    Product.findOne({ _id: req.params.productid }, (err, product) => {
        if (err) {
            return res.send("Not Found");
        }
        if (product.time < new Date()) {
            return res.send("You are late");
        }
        if (product.bidders.length > 0) {
            product.bidders.sort((a, b) => (a.bid > b.bid) ? -1 : ((b.bid > a.bid) ? 1 : 0));
            if (req.body.bid <= product.bidders[0].bid) {
                return res.send("You must Bid Higher than the current highest bid!");
            }
        }
        Product.updateOne({ _id: req.params.productid }, {
            $push: {
                bidders: {
                    bidder: new ObjectId(req.session._id),
                    bid: req.body.bid
                }
            }
        }, (err, pro) => {
            if (err) {
                return res.send("Error Occured");
            }
            res.send("Bid Added");
        })
    })
});

module.exports = router;
