#!/usr/bin/env node

var child = require('child_process')
var fs = require('fs')
var os = require('os')
var path = require('path')
var daemon = require('daemonspawn')
var catNames = require('cat-names')
var keypair = require('keypair')
var forge = require('node-forge')
var mkdirp = require('mkdirp')
var args = require('minimist')(process.argv.slice(2))

handle(args._, args) 

function handle (cmds, opts) {
  
  var dir = opts.path || opts.p || path.join(process.cwd(), 'linux')
  if (!opts.stderr) opts.stderr = path.join(dir, 'stderr.log')
  if (!opts.stdout) opts.stdout = path.join(dir, 'stdout.log')
  var linuxPid = opts.pid || path.join(dir, 'linux.pid')
  var linuxHostname = path.join(dir, 'hostname')
  var keyPath = path.join(dir, 'id_rsa')

  var cmd = cmds[0]
  if (typeof cmd === 'undefined') {
    return console.log(
      'Usage:     linux <command> [args...]\n' +
      '\n' +
      'Commands:\n' +
      '  init     creates a new ./linux folder in this directory to hold config\n' +
      '  boot     boots up linux from config in ./linux\n' +
      '  status   checks if linux is running or not\n' +
      '  ssh      sshes into linux and attaches the session to your terminal\n' +
      '  run      runs a single command over ssh\n' +
      '  halt     runs sudo halt in linux, initiating a graceful shutdown\n' +
      '  kill     immediately ungracefully kills the linux process with SIGKILL\n' +
      '  pid      get the pid of the linux process'
    )
  }
  
  if (cmd === 'init') {
    if (fs.existsSync(dir)) return console.log('Error: linux config folder already exists, skipping init')
    mkdirp.sync(dir)
    if (!fs.existsSync(keyPath)) saveNewKeypairSync()
    console.log('Created new config folder at', dir)
    return
  }

  if (cmd === 'boot') {
    // ensure linux folder exists
    if (!fs.existsSync(dir)) return console.log('Error: no linux config folder found, run linux init first')
    
    // ensure key permissions are correct
    fs.accessSync(keyPath)

    getPid()
    
    function getPid () {
      fs.exists(linuxPid, function (exists) {
        if (!exists) return boot()
        readPid(function (err, pid) {
          if (err) throw err
          if (!pid) return boot()
          getStatus(pid)
        })
      })
    }
    
    function getStatus (pid) {
      daemon.status(pid, function (err, running) {
        if (err) throw err
        if (running) return console.error('Linux is already running')
        boot()
      })      
    }
    
    function boot () {
      var hostname = opts.hostname || [catNames.random(), catNames.random(), catNames.random(), catNames.random()].join('-').toLowerCase().replace(/\s/g, '-')
      var xhyve = __dirname + '/xhyve'
      var bootArgs = createBootArgs(hostname, keyPath)

      if (opts.debug) return console.log(xhyve + ' ' + bootArgs.join(' '))

      // TODO switch back to daemonspawn for the spawning
      // convert filenames to file descriptors
      opts.stdio = ['ignore', fs.openSync(opts.stdout, 'a'), fs.openSync(opts.stderr, 'a')]
      opts.detached = true
      var linux = child.spawn(xhyve, bootArgs, opts)
      linux.unref()
      
      var pid = linux.pid
      fs.writeFileSync(linuxPid, pid.toString())
      fs.writeFileSync(linuxHostname, hostname)
      pollIp(hostname, pid)
    }
    
    function pollIp (hostname, pid) {
      var timeout = Date.now() + (opts.timeout || 1000 * 15)

      check()
      
      function check () {
        if (Date.now() > timeout) {
          console.error('Error: Timed out waiting for linux to boot')
          kill()
          return
        }
        
        parseIp(hostname, function (err, ip) {
          if (err) {
            console.error(err)
            kill()
            return
          }
          if (!ip) return setTimeout(check, 1000)
          console.log('Linux has booted', {ip: ip, hostname: hostname, pid: pid})
        })
      }
      
      function kill () {
        daemon.kill(pid, function (err) {
          if (err) throw err
          process.exit(1)
        })
      }
    }
    
    function saveNewKeypairSync () {
      var pair = keypair()
      var publicKey = forge.pki.publicKeyFromPem(pair.public)
      var ssh = forge.ssh.publicKeyToOpenSSH(publicKey, 'root@localhost') // todo would whoami + hostname be better?
      
      fs.writeFileSync(keyPath, pair.private, {mode: 0o600})
      fs.writeFileSync(keyPath + '.pub', ssh)
    }
    
    return
  }
  
  if (cmd === 'pid') {
    readPid(function (err, pid) {
      if (err) throw err
      console.log(pid)
    })
    return
  }

  if (cmd === 'status') {
    linuxStatus(function (err, running, pid) {
      if (err) throw err
      if (running) console.log('Linux is running', {pid: pid})
      else console.log('Linux is not running')
    })
    return
  }

  if (cmd === 'kill') {
    linuxStatus(function (err, running, pid) {
      if (err) throw err
      if (!running) return console.log('Linux was not running')
      daemon.kill(pid, function (err) {
        if (err) throw err
        console.log('Linux has been killed')
      })
    })
    return
  }
  
  if (cmd === 'ssh') {
    return ssh()
  }
  
  if (cmd === 'run') {
    // run is special, we want to forward raw args to ssh
    var runIdx
    for (var i = 0; i < process.argv.length; i++) {
      if (process.argv[i] === 'run') {
        runIdx = i
        break
      }
    }
    return ssh(process.argv.slice(runIdx + 1))
  }
  
  if (cmd === 'halt') {
    return ssh(['sudo', 'halt'])
    // todo wait till xhyve actually exits
  }
  
  console.log(cmd, 'is not a valid command')
  
  function ssh (commands) {
    var hostname = fs.readFileSync(linuxHostname).toString()
    parseIp(hostname, function (err, ip) {
      if (err) throw err
      if (!ip) return console.error('Error: Could not find ip for linux hostname', hostname)
      var args = ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', 'tc@' + ip]
      if (commands) args = args.concat(commands)
      child.spawn('ssh', args, {stdio: 'inherit'})
    })
  }
  
  function linuxStatus (cb) {
    readPid(function (err, pid) {
      if (err) throw err
      if (!pid) return cb()
      daemon.status(pid, function (err, running) {
        cb(err, running, pid)
      })
    })
  }
  
  function parseIp (hostname, cb) {
    child.exec(__dirname + '/get-ip.sh ' + hostname, function (err, stdout, stderr) {
      if (err) return cb(err)
      var ip = stdout.toString().trim()
      cb(null, ip)
    })
  }
  
  function createBootArgs (host, key) {
    var kernel = __dirname + '/vmlinuz64'
    var initrd = __dirname + '/initrd.gz'
    var keyString = '"' + fs.readFileSync(key + '.pub').toString().trim() + '"'
    var cmdline = "earlyprintk=serial host=" + host + " sshkey=" + keyString
    var args = [
      '-A',
      '-m', '1G',
      '-s', '0:0,hostbridge',
      '-s', '31,lpc',
      '-l', 'com1,stdio',
      '-s', '2:0,virtio-net',
      '-f', ['kexec', kernel, initrd, '"' + cmdline + '"'].join(',')
    ]
    return args
  }

  function readPid (cb) {
    fs.readFile(linuxPid, function (err, buf) {
      if (err) return cb(err)
      var pid = +buf.toString()
      if (isNaN(pid)) return cb()
      cb(null, pid)
    })
  }
  
}