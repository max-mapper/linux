#!/bin/bash

PUBKEY=$(cat $1)
HOSTNAME=$(uuidgen)
CMDLINE="earlyprintk=serial console=ttyS0 host=$HOSTNAME sshkey=\"$PUBKEY\""
echo $HOSTNAME > CURRENT_HOSTNAME
./xhyve -A -m 1G -s 0:0,hostbridge -s 31,lpc -l com1,stdio -s 2:0,virtio-net -f kexec,vmlinuz64,initrd.gz,"$CMDLINE"