import dotenv from "dotenv";
import redis from "redis";

dotenv.config();

const port = 6379;

// export const client = redis.createClient({
//   url: process.env.REDIS_URL,
// });

// export const client = redis.createClient({
//   url: "redis://redis:6379",
// });
export const client = redis.createClient(port);

client.on("connect", () => {
  console.log("connected to redis");
});

client.on("error", (err) => {
  console.error("redis error: ", err);
});

await client.connect();

const cacheUsers = async (req, res, next) => {
  const data = await client.get("all_users");
  if (data !== null) {
    res.status(200).send(JSON.parse(data));
  } else {
    next();
  }
};

const cachePosts = async (req, res, next) => {
  const data = await client.get("all_posts");
  if (data !== null) {
    res.status(200).send(JSON.parse(data));
  } else {
    next();
  }
};

const cacheStories = async (req, res, next) => {
  const data = await client.get("all_stories");
  if (data !== null) {
    res.status(200).send(JSON.parse(data));
  } else {
    next();
  }
};

const deleteCache = async (key) => {
  await client.del(key);
};

export { cacheUsers, cachePosts, cacheStories, deleteCache };
