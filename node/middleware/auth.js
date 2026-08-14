const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'insecure_dev_secret';
const COOKIE_NAME = 'pyu_token';

const signToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name, picture: user.avatar_url },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const authMiddleware = (req, res, next) => {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) {
        res.locals.user = null;
        return next();
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        res.locals.user = payload;
    } catch (err) {
        res.clearCookie(COOKIE_NAME);
        req.user = null;
        res.locals.user = null;
    }
    next();
};

const setAuthCookie = (res, user) => {
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

const clearAuthCookie = (res) => {
    res.clearCookie(COOKIE_NAME);
};

const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

module.exports = {
    authMiddleware,
    setAuthCookie,
    clearAuthCookie,
    requireAuth,
    COOKIE_NAME
};