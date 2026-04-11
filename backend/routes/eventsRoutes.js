const express = require("express");
const {
  getAllEvents,
  createEvent,
} = require("../controllers/eventsController");

const router = express.Router();

router.get("/events", getAllEvents);
router.post("/events", createEvent);

module.exports = router;
