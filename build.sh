#!/bin/sh
# prerequisites: apt-get install squashfs-tools/brew install squashfs

# exit on any error
set -e

mkdir -p dist

# install packages
for f in tczs/*.tcz; do echo "Unpacking $f" && unsquashfs -f -d dist $f; done

# enter dist folder
cd dist

# extract rootfs
zcat < ../corepure64.gz | sudo cpio -i -d

# enables terminal (i think, blindly copied from xhyve example)
sudo sed -ix "/^# ttyS0$/s#^..##" etc/securetty
sudo sed -ix "/^tty1:/s#tty1#ttyS0#g" etc/inittab

# configure ssh server
sudo cp usr/local/etc/ssh/sshd_config_example usr/local/etc/ssh/sshd_config
sudo mkdir var/ssh
sudo chmod 0755 var/ssh
sudo mkdir -p home/tc/.ssh

# leave dist
cd ../

# copy our files in
sudo rsync --recursive include/ dist

# repackage core into final output
(cd dist ; sudo find . | sudo cpio -o -H newc) | gzip -c > initrd.gz

# cleanup
sudo rm -rf dist

echo "done"
