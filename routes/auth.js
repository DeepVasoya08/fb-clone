import express from "express";
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
      res.status(404).json({ message: "user not found!" });
      return;
    }
    const validatePass = await decrypt(req.body.password, user);
    if (!validatePass) {
      res.status(400).json({ message: "invalid credentials!" });
      return;
    }
    await user.save();
    const { password, ...rest } = user._doc;
    res.status(200).json(rest);
  } catch (error) {
    res.status(500).json(error);
  }
});

export default router;
