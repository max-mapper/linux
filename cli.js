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
      'Usage:   linux <boot,status,ssh,halt,kill> [args..]\n' +
      '\n' +
      'boot     boots up linux in ./linux\n' +
      'status   checks if linux is running or not\n' +
      'ssh      sshes into linux and attaches the session to your terminal\n' +
      'halt     runs sudo halt in linux, initiating a graceful shutdown\n' +
      'kill     immediately kills the linux process with SIGKILL\n' +
      'pid      get the pid of the linux process'
    )
  }

  if (cmd === 'boot') {
    if (!fs.existsSync(dir)) mkdirp.sync(dir)
    if (!fs.existsSync(keyPath)) saveNewKeypairSync()

    getPid()
    
    function getPid () {
      fs.exists(linuxPid, function (exists) {
        if (!exists) return boot()
        fs.readFile(linuxPid, function (err, buf) {
          if (err) throw err
          var pid = +buf.toString()
          if (isNaN(pid)) return boot()
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
      var hostname = opts.hostname || [catNames.random(), catNames.random(), catNames.random(), catNames.random()].join('-').toLowerCase()
      var bootCmd = bootCommand(hostname, keyPath)

      // convert filenames to file descriptors
      opts.stdout = fs.openSync(opts.stdout, 'a')
      opts.stderr = fs.openSync(opts.stderr, 'a')
      
      // var linux = daemon.spawn(bootCmd, opts)
      console.log(bootCmd)
      fs.writeFileSync(linuxPid, linux.pid.toString())
      fs.writeFileSync(linuxHostname, hostname)
      console.log('Linux is booting', {pid: linux.pid, hostname: hostname})
    }
    
    function saveNewKeypairSync () {
      var pair = keypair()
      var publicKey = forge.pki.publicKeyFromPem(pair.public)
      var ssh = forge.ssh.publicKeyToOpenSSH(publicKey, 'root@localhost')
      
      fs.writeFileSync(keyPath, pair.private)
      fs.writeFileSync(keyPath + '.pub', ssh)
    }
    
    return
  }
  
  if (cmd === 'pid') {
    var pid = fs.readFileSync(linuxPid).toString()
    console.log(pid)
    return
  }

  // if (cmd === 'status') {
  //   var pid = cmds[1]
  //   if (!pid) return console.log('Usage: daemonspawn kill <pid>')
  //   daemon.status(pid, function (err, running) {
  //     if (err) throw err
  //     if (running) console.log('daemon is running')
  //     else console.log('daemon is not running')
  //   })
  //   return
  // }
  //
  // if (cmd === 'kill') {
  //   var pid = cmds[1]
  //   if (!pid) return console.log('Usage: daemonspawn kill <pid>')
  //   daemon.kill(pid, function (err) {
  //     if (err) throw err
  //     console.log('daemon has been killed')
  //   })
  //   return
  // }
  
  console.log(cmd, 'is not a valid command')
}

function bootCommand (host, key) {
  var kernel = __dirname + '/vmlinuz64'
  var initrd = __dirname + '/initrd.gz'
  var xhyve = __dirname + '/xhyve'
  var cmdline = "earlyprintk=serial host=" + host + ' sshkey=\\"' + fs.readFileSync(key + '.pub').toString().trim() + '\\"'
  var xhyveArgs = '-A -m 1G -s 0:0,hostbridge -s 31,lpc -l com1,stdio -s 2:0,virtio-net'
  var bootCmd = xhyve + ' ' + xhyveArgs + ' -f kexec,' + kernel + ',' + initrd + ',"' + cmdline + '"'
  return bootCmd
}
