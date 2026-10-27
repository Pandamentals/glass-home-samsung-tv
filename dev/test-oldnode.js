#!/usr/bin/env node
// The TV's service runs Node 4.4: no crypto.timingSafeEqual, no url.URL, and
// Buffer.from is Uint8Array.from (it does not decode text). This imitates all
// three, then checks the service code that needs them.
//   node dev/test-oldnode.js
'use strict';
const path = require('path');
const crypto = require('crypto');
const SERVICE = path.join(__dirname, '..', 'app', 'service');

delete crypto.timingSafeEqual;
const auth = require(path.join(SERVICE, 'auth.js'));
const { LegacyURL } = require(path.join(SERVICE, 'urlshim.js'));

let n = 0, bad = 0;
const check = (name, ok) => { n++; if (!ok) { bad++; console.log('FAIL  ' + name); } };

{
  // A stand-in global Buffer shaped like Node 4.4's: from is Uint8Array.from,
  // while `new Buffer(text, encoding)` still decodes.
  const RealBuffer = Buffer;
  function OldBuffer(text, enc) { return RealBuffer.from(text, enc); }
  OldBuffer.from = Uint8Array.from;
  global.Buffer = OldBuffer;
  let b;
  try { b = auth.bufFromString('AAEC', 'base64'); } finally { global.Buffer = RealBuffer; }
  check('base64 decodes when Buffer.from is Uint8Array.from', RealBuffer.isBuffer(b) && b.length === 3 && b[0] === 0 && b[1] === 1 && b[2] === 2);
}
check('timingSafeEqual really removed', typeof crypto.timingSafeEqual === 'undefined');
check('equal strings match', auth.timingSafeEqualStr('abc123', 'abc123') === true);
check('different strings differ', auth.timingSafeEqualStr('abc123', 'abc124') === false);
check('different lengths differ', auth.timingSafeEqualStr('abc', 'abcd') === false);
check('empty vs text differs', auth.timingSafeEqualStr('', 'x') === false);

auth.hashPassword('correct-horse-battery-12', 1000, false).then(rec =>
  auth.verifyPassword('correct-horse-battery-12', rec).then(ok => {
    check('password verifies without timingSafeEqual', ok === true);
    return auth.verifyPassword('wrong-horse-battery-12', rec);
  }).then(ok => check('wrong password refused without timingSafeEqual', ok === false)
)).then(() => {
  const u = new LegacyURL('https://user:pw@www.example.com:8443/a/b?x=1#h');
  check('url protocol', u.protocol === 'https:');
  check('url credentials', u.username === 'user' && u.password === 'pw');
  check('url host, port, path, search', u.hostname === 'www.example.com' && u.port === '8443' && u.pathname === '/a/b' && u.search === '?x=1');
  check('url origin', u.origin === 'https://www.example.com:8443');
  check('url relative resolve', new LegacyURL('/icon.png', new LegacyURL('https://a.test/x/y')).href === 'https://a.test/icon.png');
  check('url relative with base string', new LegacyURL('z.png', 'https://a.test/x/y').href === 'https://a.test/x/z.png');
  let threw = false; try { new LegacyURL('javascript:alert(1)'); } catch (e) { threw = true; }
  check('non-http url rejected', threw);
  threw = false; try { new LegacyURL('not a url'); } catch (e) { threw = true; }
  check('plain text rejected', threw);
  console.log(n + ' checks, ' + bad + ' failed');
  process.exit(bad ? 1 : 0);
});
