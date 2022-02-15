var mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    uid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        required: true
    },
    about: {
        type: String,
        default: ""
    },
    tags: [{
        type: String
    }],
    img: {
        data: Buffer,
        contentType: String
    },
    time: {
        type: Date
    },
    bidders: [{
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        bid: {
            type: Number
        }
    }],
    rateValue: {
        type: Number,
        default: 0,
        max: 5
    },
    rateCount: {
        type: Number,
        default: 0
    },
    comments: [{
        comment: {
            type: String,
            default: ""
        },
        commenter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }]
});

module.exports = mongoose.model("Product", productSchema);