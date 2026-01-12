/**
 * Export wszystkich routes
 */

const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const panelRoutes = require('./panel');
const apiRoutes = require('./api');

module.exports = {
    authRoutes,
    adminRoutes,
    panelRoutes,
    apiRoutes
};
