#!/usr/bin/env node
var initrd = 'https://github.com/maxogden/hypercore/releases/download/v2.1.0/initrd.gz'
var kernel = 'https://github.com/maxogden/hypercore/releases/download/v2.1.0/vmlinuz64'

var nugget = require('nugget')

console.log('Downloading linux kernel + fs from https://github.com/maxogden/hypercore/releases\n')

nugget([kernel, initrd], {resume: true, verbose: true}, function (err) {
  if (err) throw err
  process.exit(0)
})
