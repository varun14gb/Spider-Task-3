auth = (req, res, next) => {
    const nonSecurePaths = ['/', '/users/login', '/signup', '/users/register'];
    if (nonSecurePaths.includes(req.path)) return next();
    if (!req.session.loggedIn) {
        return res.redirect('/');
    }
    next();
}

module.exports = { auth };