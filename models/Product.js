var mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    uid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        required
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
        contentType: String,
        required
    },
    time: {
        type: Date
    },
    bidders: [new mongoose.Schema({
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        bid: {
            type: Number
        }
    }, { _id: false })]
});

module.exports = mongoose.model("Product", productSchema);