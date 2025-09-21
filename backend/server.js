const express = require("express");
const dotenv = require('dotenv')

dotenv.config();

const app= express();

app.get('/', (req, res) => {
    res.send("Hello World!")
})

app.listen(3030, () => {
    console.log("Server running on port 3030");
})