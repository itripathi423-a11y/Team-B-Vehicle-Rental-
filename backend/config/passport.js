require("dotenv").config({ path: __dirname + "/../.env" });

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const name = profile.displayName;

      db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
        if (err) return done(err);

        if (rows.length > 0) {
          return done(null, rows[0]);
        }

        db.query(
          "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
          [name, email, "0000000000", "GOOGLE_AUTH", "user"],
          (err2, result) => {
            if (err2) return done(err2);

            db.query(
              "SELECT * FROM users WHERE id = ?",
              [result.insertId],
              (err3, newUser) => {
                if (err3) return done(err3);
                return done(null, newUser[0]);
              }
            );
          }
        );
      });
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
    if (err) return done(err);
    done(null, rows[0]);
  });
});

module.exports = passport;