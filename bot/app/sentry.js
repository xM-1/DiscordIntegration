module.exports = function (config) {
    const Sentry = require('@sentry/node');

    Sentry.init({
        dsn: config.dsn
    });
};