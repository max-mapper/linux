```
# build it
./build.sh

# start it
sudo xhyve -A -m 1G -s 0:0,hostbridge -s 31,lpc -l com1,stdio -s 2:0,virtio-net -f kexec,vmlinuz64,initrd.gz,"earlyprintk=serial console=ttyS0"

# log in to it
ssh -i hypercore.rsa tc@192.168.64.<num>
```