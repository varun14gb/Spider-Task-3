auth = (req, res, next) => {
    const nonSecurePaths = ['/', '/users/login', '/users/register'];
    if (nonSecurePaths.includes(req.path)) return next();
    if (!req.session.loggedIn) {
        return res.render('index', { title: 'Login First' });
    }
    next();
}

module.exports = { auth };