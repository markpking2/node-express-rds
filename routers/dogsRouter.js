const router = require("express").Router();
const db = require("../data/dbConfig");

router.get("/", async (req, res) => {
    try {
        const dogs = await db("dogs");
        res.status(200).json({ dogs });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Error retrieving dogs from database.",
        });
    }
});

module.exports = router;
