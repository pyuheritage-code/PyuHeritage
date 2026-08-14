const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const userModel = require('../../models/site/userModel');
const { setAuthCookie, clearAuthCookie } = require('../../middleware/auth');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3003/auth/google/callback';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const STATE_COOKIE = 'oauth_state';

const googleAuth = (req, res) => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        return res.status(500).send('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in node/.env');
    }

    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        state: state,
        prompt: 'select_account'
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
};

const googleCallback = async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect('/');
    }

    if (!code || !state || state !== req.cookies?.[STATE_COOKIE]) {
        return res.status(400).send('Invalid OAuth state');
    }
    res.clearCookie(STATE_COOKIE);

    try {
        const tokenRes = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
        }));

        const accessToken = tokenRes.data.access_token;

        const profileRes = await axios.get(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const profile = {
            google_id: String(profileRes.data.id),
            email: profileRes.data.email,
            name: profileRes.data.name || profileRes.data.email,
            avatar_url: profileRes.data.picture || null
        };

        userModel.findByGoogleId(profile.google_id, (err, rows) => {
            if (err) return handleCallbackError(res, err);

            if (rows && rows.length > 0) {
                userModel.updateLastLogin(rows[0].id, (updateErr) => {
                    if (updateErr) console.error('updateLastLogin error:', updateErr.message);
                });
                const user = { id: rows[0].id, email: rows[0].email, name: rows[0].name, avatar_url: rows[0].avatar_url };
                setAuthCookie(res, user);
                return res.redirect('/');
            }

            // No Google account yet: if a local account uses this email, link them.
            userModel.findByEmail(profile.email, (emailErr, emailRows) => {
                if (emailErr) return handleCallbackError(res, emailErr);

                if (emailRows && emailRows.length > 0) {
                    userModel.linkGoogleAccount(emailRows[0].id, profile.google_id, profile.avatar_url, (linkErr) => {
                        if (linkErr) return handleCallbackError(res, linkErr);
                        const user = { id: emailRows[0].id, email: emailRows[0].email, name: emailRows[0].name, avatar_url: profile.avatar_url };
                        setAuthCookie(res, user);
                        return res.redirect('/');
                    });
                    return;
                }

                userModel.createUser(profile, (createErr, result) => {
                    if (createErr) return handleCallbackError(res, createErr);
                    const user = { id: result.insertId, email: profile.email, name: profile.name, avatar_url: profile.avatar_url };
                    setAuthCookie(res, user);
                    return res.redirect('/');
                });
            });
        });
    } catch (err) {
        console.error('Google callback error:', err.message);
        return handleCallbackError(res, err);
    }
};

const handleCallbackError = (res, err) => {
    console.error('Auth error:', err.message);
    return res.status(500).send('Sign in with Google failed. Please try again.');
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

const signinPage = (req, res) => {
    if (req.user) return res.redirect('/');
    res.render('site/auth/signin', { error: null });
};

const signupPage = (req, res) => {
    if (req.user) return res.redirect('/');
    res.render('site/auth/signup', { error: null });
};

const signinPost = (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        return res.render('site/auth/signin', { error: 'Email and password are required.' });
    }

    userModel.findByEmail(email, (err, rows) => {
        if (err) return res.render('site/auth/signin', { error: 'Something went wrong. Please try again.' });

        if (!rows || rows.length === 0 || !rows[0].password_hash) {
            return res.render('site/auth/signin', { error: 'Invalid email or password.' });
        }

        bcrypt.compare(password, rows[0].password_hash, (bcryptErr, match) => {
            if (bcryptErr) return res.render('site/auth/signin', { error: 'Something went wrong. Please try again.' });
            if (!match) return res.render('site/auth/signin', { error: 'Invalid email or password.' });

            userModel.updateLastLogin(rows[0].id, (updateErr) => {
                if (updateErr) console.error('updateLastLogin error:', updateErr.message);
            });
            const user = { id: rows[0].id, email: rows[0].email, name: rows[0].name, avatar_url: rows[0].avatar_url };
            setAuthCookie(res, user);
            return res.redirect('/');
        });
    });
};

const signupPost = (req, res) => {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';

    const fail = (error) => res.render('site/auth/signup', { error });

    if (!USERNAME_RE.test(username)) {
        return fail('Username must be 3–30 characters (letters, numbers, underscore).');
    }
    if (!EMAIL_RE.test(email)) {
        return fail('Please enter a valid email address.');
    }
    if (password.length < 6) {
        return fail('Password must be at least 6 characters.');
    }
    if (password !== confirmPassword) {
        return fail('Passwords do not match.');
    }

    userModel.findByEmail(email, (err, emailRows) => {
        if (err) return fail('Something went wrong. Please try again.');
        if (emailRows && emailRows.length > 0) {
            return fail('An account with this email already exists.');
        }

        userModel.findByUsername(username, (err2, userRows) => {
            if (err2) return fail('Something went wrong. Please try again.');
            if (userRows && userRows.length > 0) {
                return fail('This username is already taken.');
            }

            bcrypt.hash(password, 10, (hashErr, hash) => {
                if (hashErr) return fail('Something went wrong. Please try again.');

                userModel.createLocalUser({ email, username, name: username, password_hash: hash }, (createErr, result) => {
                    if (createErr) {
                        if (createErr.code === 'ER_DUP_ENTRY') {
                            return fail('An account with this email or username already exists.');
                        }
                        return fail('Something went wrong. Please try again.');
                    }
                    const user = { id: result.insertId, email, name: username, avatar_url: null };
                    setAuthCookie(res, user);
                    return res.redirect('/');
                });
            });
        });
    });
};

const changeUsername = (req, res) => {
    const username = (req.body.username || '').trim();

    if (!USERNAME_RE.test(username)) {
        return res.json({ success: false, error: 'Username must be 3–30 characters (letters, numbers, underscore).' });
    }
    if (username === req.user.name) {
        return res.json({ success: false, error: 'That is already your current username.' });
    }

    userModel.findByUsername(username, (err, rows) => {
        if (err) return res.json({ success: false, error: 'Something went wrong. Please try again.' });

        if (rows && rows.length > 0 && rows[0].id !== req.user.id) {
            return res.json({ success: false, error: 'This username is already taken.' });
        }

        userModel.updateUsername(req.user.id, username, (updateErr) => {
            if (updateErr) {
                if (updateErr.code === 'ER_DUP_ENTRY') {
                    return res.json({ success: false, error: 'This username is already taken.' });
                }
                return res.json({ success: false, error: 'Something went wrong. Please try again.' });
            }

            const user = { id: req.user.id, email: req.user.email, name: username, avatar_url: req.user.picture };
            setAuthCookie(res, user);
            return res.json({ success: true, name: username });
        });
    });
};

const logout = (req, res) => {
    clearAuthCookie(res);
    res.redirect('/');
};

module.exports = {
    googleAuth,
    googleCallback,
    signinPage,
    signupPage,
    signinPost,
    signupPost,
    changeUsername,
    logout
};