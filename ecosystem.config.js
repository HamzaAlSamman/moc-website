// pm2 process definition for the production server.
//
// Both settings below lived only in pm2's in-memory process list until now,
// which is how a `pm2 delete moc-next` took the site down: the recreated
// process lost them, fell back to Next's default port 3000 — already held by
// Grafana — and crash-looped on EADDRINUSE while Apache kept proxying to an
// empty 3001. Keeping them in the repo means the port survives any delete,
// restart or reboot.
//
//   pm2 delete moc-next && pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "moc-next",
      script: "npm",
      args: "start",
      cwd: "/var/www/vhosts/moc.gov.sy/httpdocs/next-app",
      env: {
        // Apache proxies moc.gov.sy here — see ProxyPass in
        // /var/www/vhosts/system/moc.gov.sy/conf/vhost.conf. Port 3000 is
        // Grafana's and 3100 is alsham.moc.gov.sy.
        PORT: 3001,
        // egate.paymera.cc resolves to both A and AAAA records, and this
        // server's IPv6 egress is broken: Node tries the AAAA address first
        // and every Paymera call dies with ConnectTimeoutError. curl survives
        // it, Node's fetch does not.
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
    },
  ],
};
