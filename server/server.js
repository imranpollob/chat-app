const path = require('path')
const express = require('express')

const publicPath = path.join(__dirname, '../public')
const port = process.env.PORT || 5000
const app = express()

app.use(express.static(publicPath))

app.listen(port, () => {
    console.log('Server is running on port 5000')
})
