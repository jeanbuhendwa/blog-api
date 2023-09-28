const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadmiddleware = multer({ dest: "uploads/" });
const fs = require("fs");

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = "sbbksjkfjsfljslkfowirw";

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(
  "mongodb+srv://blog:085JBirenge@cluster0.frnf1sa.mongodb.net/"
);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (error) {
    res.status(400).json(error);
  }
});

// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   const userDoc = await User.findOne({ username });
//   const passOk = bcrypt.compareSync(password, userDoc.password);
//   if (passOk) {
//     jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
//       if (err) throw err;
//       res.cookie("token", token).json("ok");
//     });
//   } else {
//     res.status(400).json("Invalid username or password");
//   }
// });

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const userDoc = await User.findOne({ username });

    if (!userDoc) {
      res.status(400).json("Invalid username or password");
      return;
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);

    if (passOk) {
      jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
        if (err) throw err;
        res.cookie("token", token).json({
          username,
          id: userDoc._id,
        });
      });
    } else {
      res.status(400).json("Invalid username or password");
    }
  } catch (error) {
    res.status(500).json("Internal server error");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadmiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});
app.listen(5000);
