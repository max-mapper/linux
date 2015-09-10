#!/bin/sh
LOGIN="tc@$1 -i $2"
ssh -o StrictHostKeyChecking=no $LOGIN ${@:2}
