#!/bin/sh
# put other system startup commands here
sudo chown -R tc /home/tc # sanity check
sudo /usr/local/etc/init.d/openssh start