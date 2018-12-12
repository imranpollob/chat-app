const path = require('path')
const http = require('http')
const express = require('express')
const socketIO = require('socket.io')

const publicPath = path.join(__dirname, '../public')
const port = process.env.PORT || 5000
const app = express()
const server = http.createServer(app)
const io = socketIO(server)

app.use(express.static(publicPath))

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('createMessage', (msg) => {
    console.log('createMessage', msg);

    io.emit('newMessage', {
      to: "tanji",
      text: "I am already here",
      msg
    })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected');
  })
})

server.listen(port, () => {
  console.log('Server is running on port 5000')
})
