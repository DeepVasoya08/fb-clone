import Posts from "../models/Post.js";
import { gfs as post_gfs } from "../routes/posts.js";

// delete all posts of deleted user
const deletePosts = async (id) => {
  try {
    const posts = await Posts.find({
      userId: id,
    });
    for (let p of posts) {
      const fileID = p.imageID;
      if (fileID) {
        await post_gfs.delete(
          new mongoose.Types.ObjectId(fileID),
          (err, data) => {
            if (err) {
              console.error(err);
            }
          }
        );
      }
      await p.deleteOne();
    }
  } catch (error) {
    console.error(error);
  }
};

export { deletePosts };
