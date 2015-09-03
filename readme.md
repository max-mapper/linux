```
# dependencies
wget, apt-get install squashfs-tools/brew install squashfs

# build it
./build.sh

# start it
sudo ./boot.sh <your-public-ssh-key>.pub

# log in to it
./ssh.sh <your-private-ssh-key>

# if you need to generate an ssh keypair to use for this
ssh-keygen -f hypercore.rsa -t rsa -N ''
```