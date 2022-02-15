var express = require('express');
const Product = require('../models/Product');
var ObjectId = require('mongodb').ObjectId;
var fs = require('fs');
var path = require('path');
var multer = require('multer');
const { compareSync } = require('bcryptjs');

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
    var query = {};
    if (req.query.search) {
        const title = {
            $regex: new RegExp(`${req.query.search}`),
            $options: 'i'
        };
        const tags = {
            tags: req.query.search
        };
        query = {
            $or: [{ title }, { ...tags }]
        }
    }
    Product.find(query)
        .populate({ path: 'uid', select: '-password' })
        .populate({ path: 'bidders.bidder', select: '-password' })
        .exec((err, products) => {
            if (err) {
                res.status(500).render('error', {
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
            return res.status(500).render('error', {
                error: {
                    status: '500',
                    message: 'Something Wrong'
                }
            });
        }
        res.redirect('/products/' + product._id.toString())
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
            .populate({ path: 'bidders.bidder', select: '-password' })
            .populate({ path: 'comments.commenter', select: '-password' });
        if (!product) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        product.bidders.sort((a, b) => (a.bid > b.bid) ? -1 : ((b.bid > a.bid) ? 1 : 0));
        res.render('product', {
            title: product.title,
            product,
            username: req.session.username
        });
    } catch (e) {
        return res.status(500).render('error', {
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
            return res.status(500).render('error', {
                error: {
                    status: '500',
                    message: 'Something Wrong'
                }
            });
        }
        if (product.uid.toString() != req.session._id) {
            return res.status(403).render('error', {
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
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        if (product.uid.toString() != req.session._id) {
            return res.status(403).render('error', {
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
                return res.status(500).render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.redirect('/products/' + req.params.productid);
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

// POST Delete a Product
router.post('/delete/:productid', async (req, res, next) => {
    try {
        const product = await Product.findOne({ _id: new ObjectId(req.params.productid) });
        if (!product) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        if (product.uid.toString() != req.session._id) {
            return res.status(403).render('error', {
                error: {
                    status: '403',
                    message: 'Not Authorized'
                }
            });
        }
        Product.deleteOne({ _id: new ObjectId(req.params.productid) }, (err, pr) => {
            if (err) {
                return res.status(500).render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
        })
        res.redirect('/profile');
    } catch (error) {
        return res.status(500).render('error', {
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
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        if (product.time < new Date()) {
            return res.status(300).render('error', {
                error: {
                    status: '300',
                    message: 'You are late for bidding on the product!'
                }
            });
        }
        if (product.bidders.length > 0) {
            product.bidders.sort((a, b) => (a.bid > b.bid) ? -1 : ((b.bid > a.bid) ? 1 : 0));
            if (req.body.bid <= product.bidders[0].bid) {
                return res.status(300).render('error', {
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
                return res.status(500).render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.redirect('/products/' + req.params.productid);
        })
    })
});

// POST add rating to a product
router.post('/:productid/rating', upload.array(), (req, res, next) => {
    Product.findOne({ _id: req.params.productid }, (err, product) => {
        if (err) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        if (req.body.rating < 0 || req.body.rating > 5) {
            return res.status(300).render('error', {
                error: {
                    status: '300',
                    message: 'Rating should be between 0 and 5'
                }
            });
        }
        Product.updateOne({ _id: req.params.productid }, {
            $inc: {
                rateValue: req.body.rating,
                rateCount: 1
            }
        }, (err, pro) => {
            if (err) {
                return res.status(500).render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.redirect('/products/' + req.params.productid);
        })
    })
});

// POST comment on a Product
router.post('/:productid/comment', upload.array(), function (req, res, next) {
    Product.findOne({ _id: req.params.productid }, (err, product) => {
        if (err) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        Product.updateOne({ _id: req.params.productid }, {
            $push: {
                comments: {
                    commenter: new ObjectId(req.session._id),
                    comment: req.body.comment
                }
            }
        }, (err, pro) => {
            if (err) {
                return res.status(500).render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.redirect('/products/' + req.params.productid);
        })
    })
});

// GET update comment page
router.get('/:productid/:commentid', function (req, res, next) {
    Product.findOne({ _id: req.params.productid }, (err, product) => {
        if (err) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        var comm = false;
        product.comments.find((o, i) => {
            if (o._id.toString() === req.params.commentid) {
                if (o.commenter.toString() !== req.session._id) {
                    return res.status(403).render('error', {
                        error: {
                            status: '403',
                            message: 'Not Authorized!'
                        }
                    });
                }
                comm = product.comments[i];
                return true; // stop searching
            }
        });
        if (!comm) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        res.render('editComment', {
            title: "Edit Comment",
            product,
            comm
        });
    })
});

// POST update a comment on a Product
router.post('/:productid/:commentid', upload.array(), function (req, res, next) {
    Product.findOne({ _id: req.params.productid }, (err, product) => {
        if (err) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        product.comments.find((o, i) => {
            if (o._id.toString() === req.params.commentid) {
                if (o.commenter.toString() !== req.session._id) {
                    return res.status(403).render('error', {
                        error: {
                            status: '403',
                            message: 'Not Authorized!'
                        }
                    });
                }
                product.comments[i] = { ...product.comments[i], comment: req.body.comment };
                return true; // stop searching
            }
        });
        Product.updateOne({
            _id: req.params.productid,
            "comments._id": req.params.commentid
        }, {
            $set: {
                "comments.$.comment": req.body.comment
            }
        }, (err, pro) => {
            if (err) {
                return res.status(500).render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.redirect('/products/' + req.params.productid);
        })
    })
});

// GET delete a comment on a Product
router.get('/:productid/delete/:commentid', upload.array(), function (req, res, next) {
    Product.findOne({ _id: req.params.productid }, (err, product) => {
        if (err) {
            return res.status(404).render('error', {
                error: {
                    status: '404',
                    message: 'Not Found'
                }
            });
        }
        let temp;
        product.comments.find((o, i) => {
            if (o._id.toString() === req.params.commentid) {
                if (o.commenter.toString() !== req.session._id) {
                    return res.status(403).render('error', {
                        error: {
                            status: '403',
                            message: 'Not Authorized!'
                        }
                    });
                }
                temp = o
                return true; // stop searching
            }
        });
        Product.updateOne({
            _id: req.params.productid
        }, {
            $pull: {
                comments: temp
            }
        }, (err, pro) => {
            if (err) {
                return res.status(500).render('error', {
                    error: {
                        status: '500',
                        message: 'Something Wrong'
                    }
                });
            }
            res.redirect('/products/' + req.params.productid);
        })
    })
});

module.exports = router;
