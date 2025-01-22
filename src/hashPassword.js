const bcrypt = require("bcryptjs");

const plainTextPassword = "Ehsaan123!"; // Replace with the password you want to hash

bcrypt.hash(plainTextPassword, 10, (err, hash) => {
  if (err) {
    console.error("Error hashing password:", err);
  } else {
    console.log("Hashed password:", hash);
  }
});
