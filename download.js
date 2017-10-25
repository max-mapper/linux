#!/usr/bin/env node
var initrd = 'https://github.com/maxogden/hypercore-linux/releases/download/v4.0.0/initrd.gz'
var kernel = 'https://github.com/maxogden/hypercore-linux/releases/download/v4.0.0/bzImage'

var nugget = require('nugget')

console.log('Downloading linux kernel + fs from https://github.com/maxogden/hypercore-linux/releases\n')

nugget([kernel, initrd], {resume: true, verbose: true}, function (err) {
  if (err) throw err
  process.exit(0)
})
