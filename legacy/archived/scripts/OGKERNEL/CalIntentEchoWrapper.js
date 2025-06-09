// CalIntentEchoWrapper.js — runtime-safe, auto-intent commit hook
const fs = require('fs');
const path = require('path');
const { commitIntent } = require('./CalIntentEcho');

module.exports = function(agentName, intent, signature = "vault://default/commit") {
  commitIntent({
    agent: agentName,
    intent,
    signature
  });
};
