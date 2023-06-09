const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

const Post = require("../../models/Post");
const User = require("../../models/User");
const checkById = require("../../middleware/checkObjectId");

// @route  POST api/posts
// @desc   Create a post
// @access Private
router.post(
  "/",
  auth,
  check("text", "Text is required").notEmpty(),
  check("foundedDate", "Founded date is required").notEmpty(),
  check("foundedDate", "Found date should be a date").isDate(),
  check("location", "Location is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password"); // Get the user without the password

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        user: req.user.id,
        foundedDate: req.body.foundedDate,
        location: req.body.location,
      });

      const post = await newPost.save(); // Save the post

      res.json(post); // Return the post
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route POST api/posts/comment/:id
// @desc Comment on a post
// @access Private
router.post(
  "/comment/:id",
  auth,
  checkById("id"),
  check("text", "Text is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        user: req.user.id,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route  GET api/posts
// @desc   Get all posts
// @access Private
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route GET api/posts/:id
// @desc Get post by ID
// @access Private
router.get("/:id", auth, checkById("id"), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route  DELETE api/posts/:id
// @desc   Delete a post
// @access Private
router.delete("/:id", [auth, checkById("id")], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    // Check if the user is the owner of the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await Post.findByIdAndDelete({ _id: req.params.id });

    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// DELETE api/posts/comment/:id/:comment_id
// @desc Delete comment
// @access Private
router.delete("/comment/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Get the comment from the post
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );
    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: "Comment does not exist" });
    }
    // Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    post.comments = post.comments.filter(
      ({ id }) => id !== req.params.comment_id
    ); // Remove the comment from the post

    await post.save();

    return res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// PUT api/posts/found/:id
// @desc the item in the post is found
// @access Private
router.put("/found/:id", [auth, checkById("id")], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if the post is already found
    if (post.found) {
      return res.status(400).json({ msg: "Lost item already found" });
    }

    // Check if the user is the owner of the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    post.found = true;

    await post.save();

    return res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// PUT api/posts/lost/:id
// @desc the item in the post is lost
// @access Private
router.put("/lost/:id", [auth, checkById("id")], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if the post is already lost
    if (!post.found) {
      return res.status(400).json({ msg: "Lost item already lost" });
    }

    // Check if the user is the owner of the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    post.found = false;

    await post.save();

    return res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
