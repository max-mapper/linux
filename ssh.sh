#!/bin/sh

get_ip() {
    local uuid=$1
    awk '
    {
      if ($1 ~ /^name/) {
        name=substr($1, 6)
      }
      if ($1 ~ /^ip_address/) {
        ip_address=substr($1, 12)
      }
      if (name != "" && ip_address != "") {
        ip_addresses[name]=ip_address
        name=ip_address=""
      }
    }
    END {
        print ip_addresses["'$uuid'"]
    }
    ' /var/db/dhcpd_leases
}

LOGIN="tc@$(get_ip $(cat ./CURRENT_HOSTNAME)) -i $1"
ssh $LOGIN