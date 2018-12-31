const moment = require('moment')

let date = moment()
date.add('10', 'year').subtract(13, 'month')
console.log(date.format('MMM Do, YYYY'));

let my = moment(1234)
console.log(my.format('h:mm a'));

console.log(moment().valueOf())