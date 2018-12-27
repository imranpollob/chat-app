const expect = require('expect')

let { generateMessage, generateLocationMessage } = require('./message')

describe('generateMessage', () => {
  it('should generate correct message object', () => {
    let from = 'Jen'
    let text = 'Some msg'
    let message = generateMessage(from, text)

    expect(typeof message.createdAt).toBe('number');
    expect(message).toMatchObject({ from, text });
  })
})

describe('generateLocationMessage', () => {
  it('should generate correct location message object', () => {
    let from = 'Admin'
    let latitude = '23.7817483'
    let longitude = '90.4125651'
    let url = "https://www.google.com/maps?q=23.7817483,90.4125651"
    let message = generateLocationMessage(from, latitude, longitude)

    expect(typeof message.createdAt).toBe('number');
    expect(message).toMatchObject({ from, url })
  })
})