const path = require('path')
const http = require('http')
const express = require('express')
const socketIO = require('socket.io')

const publicPath = path.join(__dirname, '../public')
const port = process.env.PORT || 5000
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const { generateMessage } = require('./utils/message')

app.use(express.static(publicPath))

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'))

  socket.broadcast.emit('newMessage', generateMessage('Admin', 'New user joined'))

  socket.on('createMessage', (msg) => {
    console.log('createMessage', msg);

    io.emit('newMessage', generateMessage(msg.from, msg.text))

    // socket.broadcast.emit('newMessage', {
    //   from: msg.from,
    //   text: msg.text,
    //   createdAt: new Date().getTime()
    // })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected');
  })
})

server.listen(port, () => {
  console.log('Server is running on port 5000')
})
