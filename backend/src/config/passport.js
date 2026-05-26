'use strict';
const passport                              = require('passport');
const { Strategy: LocalStrategy }           = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const bcrypt                                = require('bcryptjs');

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password', session: false },
    async (email, password, done) => {
      try {
        const { User } = require('../models');
        const user = await User.scope('withPassword').findOne({ where: { email } });
        if (!user || !user.password_hash) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return done(null, false, { message: 'Invalid credentials' });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    process.env.JWT_SECRET,
      issuer:         'cetu-lms',
    },
    async (payload, done) => {
      try {
        const { User } = require('../models');
        const user = await User.findByPk(payload.sub);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
