var mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required
    },
    username: {
        type: String,
        required,
        unique
    },
    password: {
        type: String,
        required,
        minlength: 6
    },
    about: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model("User", userSchema);