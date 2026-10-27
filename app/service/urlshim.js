// Glass Home service - URL class that also works on old Node.
// Tizen TV services run an old Node (about 6) with no url.URL class. This gives
// the few fields the service reads, built on url.parse and url.resolve when
// the real class is missing. Node 6 API only.
'use strict';
var urlmod = require('url');

function LegacyURL(input, base) {
  var s = String(input);
  if (base !== undefined && base !== null) s = urlmod.resolve(String(base.href || base), s);
  var p = urlmod.parse(s);
  if (!p.protocol || !p.hostname) throw new TypeError('Invalid URL');
  var auth = p.auth ? String(p.auth).split(':') : [];
  this.protocol = p.protocol;
  this.username = auth[0] || '';
  this.password = auth.slice(1).join(':');
  this.hostname = p.hostname;
  this.port = p.port || '';
  this.pathname = p.pathname || '/';
  this.search = p.search || '';
  this.hash = p.hash || '';
  this.href = p.href;
  this.origin = p.protocol + '//' + p.host;
}

module.exports = { URL: urlmod.URL || LegacyURL, LegacyURL: LegacyURL };
