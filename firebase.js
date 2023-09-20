const admin = require("firebase-admin");

// Initialize firebase admin SDK
admin.initializeApp({
  credential: admin.credential.cert(
    "./config/onward-213f0-firebase-adminsdk-ke0br-46bc443794.json"
  ),
  storageBucket: "onward-213f0.appspot.com",
});
// Cloud storage
const bucket = admin.storage().bucket();

module.exports = {
  bucket,
};
