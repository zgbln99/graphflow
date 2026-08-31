/**
 * Export wszystkich routes
 */

const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const panelRoutes = require('./panel');
const apiRoutes = require('./api');
const clubRoutes = require('./club');

module.exports = {
    authRoutes,
    adminRoutes,
    panelRoutes,
    apiRoutes,
    clubRoutes
};
