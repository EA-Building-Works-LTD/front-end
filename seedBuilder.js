// seedBuilder.js
const mongoose = require("mongoose");
const User = require("../models/User"); // Adjusted path
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Upsert the builder account "zain"
    const builderData = {
      username: "zain",
      password: "Zain2025!",
      role: "builder",
    };

    // Option 1: Remove and then create new
    await User.deleteOne({ username: "zain" });
    const builder = new User(builderData);
    await builder.save();

    console.log("Builder account 'zain' has been recreated successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  });
