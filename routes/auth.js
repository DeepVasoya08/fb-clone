import express from "express";
import { generateToken, verifyToken } from "../middlewares/auth.js";
import Geo from "../models/Geo.js";
import User from "../models/User.js";
import { encrypt, decrypt } from "../utils.js";

const router = express.Router();

router.post("/get/geodata", async (req, res) => {
  const data = new Geo({
    ip: req.ip,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
  });
  await data.save();
  res.status(200).json({ message: "ok" });
});

router.post("/signup", async (req, res) => {
  try {
    const hashedPass = await encrypt(req.body.password);
    const user = new User({
      fname: req.body.fname,
      lname: req.body.lname,
      email: req.body.email,
      password: hashedPass,
    });
    await user.save();
    res.status(200).json({ message: "Sign-up Successfully" });
  } catch (err) {
    res.status(409).json({ message: "Email already in use!!" });
  }
});

router.post("/signin", async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json("email and password must be required");
  }
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "user not found!" });
    }
    const validatePass = await decrypt(req.body.password, user);
    if (!validatePass) {
      return res.status(400).json({ message: "invalid credentials!" });
    }
    const { password, ...rest } = user._doc;
    const token = await generateToken(rest._id);
    res
      .setHeader("Access-Control-Expose-Headers", "token")
      .setHeader("token", token);
    res.status(200).json(rest);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

router.post("/reload", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.uid);
    const { password, ...rest } = user._doc;
    res
      .setHeader("Access-Control-Expose-Headers", "token")
      .setHeader("token", req.token);
    res.status(200).json(rest);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

export default router;
