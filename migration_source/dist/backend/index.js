const serverless = require('serverless-http');
const app = require('./dist/app').app;

module.exports.handler = serverless(app);
