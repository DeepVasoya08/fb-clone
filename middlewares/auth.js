import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const generateToken = async (payload) => {
  return jwt.sign({ uid: payload }, process.env.TOKEN, {
    expiresIn: '24h',
  });
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    if (!token) {
      return res.status(403).json("Auth token is required!!");
    }
    const data = jwt.verify(token, process.env.TOKEN);
    req.token = token;
    req.uid = data.uid;
    next();
  } catch (error) {
    if (error.message == "jwt expired") {
      return res.status(403).json({ message: "reload" });
    }
    res.status(400).json({ message: "Something went wrong!" });
  }
};

const refreshToken = async (req, res, next) => {};

export { generateToken, verifyToken };
