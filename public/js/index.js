const socket = io()

socket.on('connect', function () {
  console.log('Connected to the server');
})

socket.on('disconnect', function () {
  console.log('Disconnected from server');
})

socket.on('newMessage', function (message) {
  console.log("New message", message);

  let li = jQuery('<li></li>').text(`${message.from}: ${message.text}`)

  jQuery('#messages').append(li)
})

socket.on('newLocationMessage', function(message) {
  let li = jQuery('<li></li>').text(`${message.from}`)
  let a = jQuery('<a target="_blank">My current location</a>').attr('href', message.url)

  li.append(a)
  jQuery('#messages').append(li)
})

jQuery('#message-form').on('submit', function (e) {
  e.preventDefault()

  socket.emit('createMessage', {
    from: 'User',
    text: jQuery('[name=message]').val()
  }, function (data) {
    console.log('Sent', data);
  })
})

let locationButton = jQuery('#send-location')

locationButton.on('click', function () {
  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by your browser')
  }

  navigator.geolocation.getCurrentPosition(function (position) {
    socket.emit('createLocationMessage', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    })
  }, function () {
    alert('Unable to fetch location')
  })
})