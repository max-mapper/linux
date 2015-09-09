# linux

**pre-alpha, proceed with caution**

npm installs [tiny core linux](http://tinycorelinux.net/) and runs it using the new Mac OS Yosemite hypervisor (via [xhyve](https://github.com/mist64/xhyve)).

Mac OS only for now, Windows support coming later through Hyper-V integration

**WARNING**
-----------
 - xhyve is a very new project, expect bugs! You must be running OS X 10.10.3 Yosemite or later and 2010 or later Mac for this to work.
 - if you use any version of VirtualBox prior to 5.0 then xhyve will crash your system either if VirtualBox is running or had been run previously after the last reboot (see xhyve's issues [#5](mist64/xhyve#5) and [#9](mist64/xhyve#9) for the full context). So, if you are unable to update VirtualBox to version 5, or later, and were using it in your current session please do restart your Mac before attempting to run xhyve.

### installation

```
npm install --global linux
```

### usage

```
sudo linux boot
# creates a ./linux folder with some state

linux ssh
# logs you in
```
