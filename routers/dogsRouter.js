const router = require("express").Router();
const db = require("../data/dbConfig");

router.get("/", async (req, res) => {
    try {
        const dogs = await db("dogs");
        if (dogs.length) {
            res.status(200).json({ dogs });
        } else {
            const err = new Error("There are no dogs in the database.");
            err.status = 404;
            throw err;
        }
    } catch (err) {
        if (err.status) {
            res.status(err.status).json({ message: err.message });
        } else {
            res.status(500).json({
                message: "Error retrieving dogs from database.",
            });
        }
    }
});

module.exports = router;
