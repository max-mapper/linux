#!/usr/bin/env node
var initrd = 'https://github.com/maxogden/HyperOS/releases/download/4.2.0/initrd.gz'
var kernel = 'https://github.com/maxogden/HyperOS/releases/download/4.2.0/bzImage'

var nugget = require('nugget')

console.log('Downloading HyperOS kernel + fs from https://github.com/maxogden/hyperos/releases\n')

nugget([kernel, initrd], {resume: true, verbose: true}, function (err) {
  if (err) throw err
  process.exit(0)
})
