var express = require('express');
const Product = require('../models/Product');
var ObjectId = require('mongodb').ObjectId;
var fs = require('fs');
var path = require('path');
var multer = require('multer');

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
                res.render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            } else {
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
            return res.render('error', {
                error: {
                    status: '500',
                    message: 'Something Wrong'
                }
            });
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
    try {
        const product = await Product.findOne({ _id: new ObjectId(req.params.productid) })
            .populate({ path: 'uid', select: '-password' })
            .populate({ path: 'bidders.bidder', select: '-password' });
        if (!product) {
            return res.render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        product.bidders.sort((a, b) => (a.bid > b.bid) ? -1 : ((b.bid > a.bid) ? 1 : 0));
        res.render('product', {
            title: product.title,
            product
        });
    } catch (e) {
        return res.render('error', {
            error: {
                status: '500',
                message: 'Oops!'
            }
        });
    }
});

// GET Product Edit Page
router.get('/edit/:productid', function (req, res, next) {
    Product.findOne({ _id: new ObjectId(req.params.productid) }, (err, product) => {
        if (err) {
            return res.render('error', {
                error: {
                    status: '500',
                    message: 'Something Wrong'
                }
            });
        }
        if (product.uid.toString() != req.session._id) {
            return res.render('error', {
                error: {
                    status: '403',
                    message: 'Not Authorized'
                }
            });
        }
        product.tags = product.tags.join(" ");
        res.render('updateProduct', {
            title: product.title,
            product
        });
    });
});

// POST Update Product's detail
router.post('/edit/:productid', upload.array(), async (req, res, next) => {
    try {
        const product = await Product.findOne({ _id: new ObjectId(req.params.productid) });
        if (!product) {
            return res.render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        if (product.uid.toString() != req.session._id) {
            return res.render('error', {
                error: {
                    status: '403',
                    message: 'Not Authorized'
                }
            });
        }
        Product.findOneAndUpdate({ _id: new ObjectId(req.params.productid) }, {
            uid: req.session._id,
            title: req.body.title,
            about: req.body.about,
            tags: req.body.tags.split(' '),
            time: new Date(req.body.time)
        }, (err, pro) => {
            if (err) {
                return res.render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.redirect('/products/' + req.params.productid);
        });
    } catch (error) {
        return res.render('error', {
            error: {
                status: '500',
                message: 'Something Wrong'
            }
        });
    }
});

// POST Delete a Product
router.post('/delete/:productid', async (req, res, next) => {
    try {
        const product = await Product.findOne({ _id: new ObjectId(req.params.productid) });
        if (!product) {
            return res.render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        if (product.uid.toString() != req.session._id) {
            return res.render('error', {
                error: {
                    status: '403',
                    message: 'Not Authorized'
                }
            });
        }
        Product.deleteOne({ _id: new ObjectId(req.params.productid) }, (err, pr) => {
            if (err) {
                return res.render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
        })
        res.send('Deleted');
    } catch (error) {
        return res.render('error', {
            error: {
                status: '500',
                message: 'Something Wrong'
            }
        });
    }

});

// POST Bidding on a Product
router.post('/bid/:productid', function (req, res, next) {
    Product.findOne({ _id: req.params.productid }, (err, product) => {
        if (err) {
            return res.render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        if (product.time < new Date()) {
            return res.render('error', {
                error: {
                    status: '300',
                    message: 'You are late for bidding on the product!'
                }
            });
        }
        if (product.bidders.length > 0) {
            product.bidders.sort((a, b) => (a.bid > b.bid) ? -1 : ((b.bid > a.bid) ? 1 : 0));
            if (req.body.bid <= product.bidders[0].bid) {
                return res.render('error', {
                    error: {
                        status: '300',
                        message: 'You must bid higher than the current highest bid'
                    }
                });
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
                return res.render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.send("Bid Added");
        })
    })
});

module.exports = router;
