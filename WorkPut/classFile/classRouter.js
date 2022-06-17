const { deleteClass, createClass, viewClass } = require("./classController");
const express = require("express");
const router = express.Router();

router.route("/:id/").get(viewClass);
router.route("/:id/").post(createClass);
router.route("/:id/:class/").delete(deleteClass);

module.exports = router;
