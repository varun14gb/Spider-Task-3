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
    Product.find({}, (err, products) => {
        if (err) {
            res.send(error);
        } else {
            console.log(products);
            res.send("succeesss");
        }
    })
});

// POST a Product
router.post('/', upload.single('image'), function (req, res, next) {
    var obj = {
        uid: req.session._id,
        title: req.body.title,
        img: {
            data: fs.readFileSync(path.join(__dirname.slice(0, -7) + '/uploads/' + req.file.filename)),
            contentType: req.file.mimetype
        }
    }
    Product.create(obj, (err, item) => {
        if (err) {
            return res.send("error");
        }
    })
    res.send('Post Added');
});

// GET a Product Information
router.get('/:productid', async (req, res, next) => {
    const product = await Product.findOne(new ObjectId(req.params._id));
    if (!product) {
        next(createError(404));
    }
    res.send(product);
});

// PUT Update Product's detail
router.put('/:productid', upload.array(), (req, res, next) => {
    console.log(req.body);
    Product.findOneAndUpdate(new ObjectId(req.params._id), {
        ...req.body
    }, (err, product) => {
        if (err) {
            return res.send("Error");
        }
        if (product.uid != req.session._id) {
            return res.send("Not Authorized");
        }
        res.send(product);
    });
});

// DELETE a Product
router.delete('/:productid', function (req, res, next) {
    Product.deleteOne(new ObjectId(req.params._id), (err, pr) => {
        if (err) {
            console.log(err);
            return res.send("Some Error");
        }
    })
    res.send('Deleted');
});

module.exports = router;
