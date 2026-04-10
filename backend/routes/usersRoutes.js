const express = require("express");
const { createUser } = require("../controllers/usersController");

const router = express.Router();

router.post("/users", createUser);

module.exports = router;
