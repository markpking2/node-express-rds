const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("<h1>Hello from Express!</h1>");
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
