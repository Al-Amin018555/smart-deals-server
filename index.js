const express = require('express');
const app = express()
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send("smart server is running")
})

app.listen(port, () => {
    console.log(`smart server is running on port ${port}`)
})