import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import debug from 'debug';
import helmet from 'helmet';
import logger from 'morgan';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { start } from './server/server.js';
import indexRoutes from './server/routes/index.js';
import authRoutes from './server/routes/auth.js';
import associationsRoutes from './server/routes/associations.js';
import {
    registerRouter,
    conflictsRouter,
} from './server/routes/registration.js';

import { appName, port } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* App Config */
const app = express();
const dbg = debug(`${appName}:app`);

// views and assets
const staticDir = join(__dirname, 'dist');
const viewDir = join(__dirname, 'server', 'views');
const browserAssetsDir = join(__dirname, 'server', 'public');

app.set('view engine', 'pug');
app.set('views', viewDir);
app.locals.basedir = staticDir;

// HTTP
app.set('port', port);
app.set('trust proxy', true);

/*  Middleware */
app.use(
    helmet({
        frameguard: { action: 'sameorigin' },
        hsts: { maxAge: 31536000 },
        referrerPolicy: 'same-origin',
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            directives: {
                'default-src': ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                // inline scripts are used in browser-only Pug templates
                scriptSrc: ["'self'", "'unsafe-inline'", 'https://appssdk.zoom.us/sdk.min.js'],
                imgSrc: ["'self'", 'data:'],
                'connect-src': ["'self'"],
                'base-uri': ["'self'"],
                'form-action': ["'self'"],
            },
        },
    })
);

app.use(express.json());
app.use(compression());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev', { stream: { write: (msg) => dbg(msg) } }));

// Static assets for browser-only pages
app.use('/browser', express.static(browserAssetsDir));
// Serve built Zoom app assets at root-level /assets so /zoom index.html can load them
app.use('/assets', express.static(join(staticDir, 'assets')));

/* Browser-only routes (no Zoom SDK) */
app.use('/register', registerRouter);
app.use('/getconflicts', conflictsRouter);

/* Auth + API (server side only) */
app.use('/auth', authRoutes);
app.use('/api/associations', associationsRoutes);

/* Zoom App - mounted at /zoom only */
app.use('/zoom', indexRoutes);
app.use('/zoom', express.static(staticDir));
app.get('/zoom/*', (req, res) => {
    res.sendFile(join(staticDir, 'index.html'));
});

// Simple landing page for root
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Zoom Meeting Manager</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                    text-align: center;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    padding: 32px;
                    max-width: 520px;
                }
                h1 { color: #333; margin-bottom: 30px; }
                p { color: #4a5568; line-height: 1.6; }
                a {
                    display: inline-block;
                    margin: 10px;
                    padding: 15px 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: bold;
                }
                a:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Zoom Meeting Manager</h1>
                <p>This is the registration page for MLSys 2026 online PC meeting.</p>
                <div>
                    <a href="/register">Register for MLSys 2026</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const title = `Error ${err.status}`;

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    if (res.locals.error) dbg(`${title} %s`, err.stack);

    // render the error page
    res.status(status);
    res.render('error');
});

// 404 handler (no SPA fallthrough)
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// start serving
start(app, port).catch(async (e) => {
    console.error(e);
    process.exit(1);
});

export default app;
