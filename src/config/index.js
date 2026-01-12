/**
 * Główna konfiguracja aplikacji
 */

module.exports = {
    app: {
        name: process.env.APP_NAME || 'GraphFlow',
        url: process.env.APP_URL || 'http://localhost:3000',
        port: parseInt(process.env.APP_PORT) || 3000,
        env: process.env.NODE_ENV || 'development'
    },

    session: {
        secret: process.env.SESSION_SECRET || 'zmien_ten_klucz_na_losowy_ciag_znakow',
        name: 'graphflow_session',
        maxAge: 24 * 60 * 60 * 1000 // 24 godziny
    },

    mail: {
        host: process.env.MAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.MAIL_PORT) || 587,
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASS || '',
        from: process.env.MAIL_FROM || 'noreply@example.com',
        fromName: process.env.MAIL_FROM_NAME || 'GraphFlow Panel'
    },

    uploads: {
        path: process.env.UPLOADS_PATH || './uploads',
        maxSize: 10 * 1024 * 1024 // 10MB
    }
};
