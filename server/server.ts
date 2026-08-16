import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import userRoutes from "./routes/userRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import { stripeWebhook } from "./controllers/stripeWebhook.js";

const app = express();

const port = process.env.PORT || 3000;

// 1. FIXED: Set the correct, complete production URL for your frontend application
const allowedOrigins = [
    'https://site-builder-4-9za6.onrender.com', // Your actual deployed Render frontend
    'http://localhost:5173',                   // Standard Vite local frontend dev port
    'http://localhost:3000'                    // Alternative local dev port
];

// 2. CORS configuration must remain at the absolute top of your middleware stack
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Keep raw webhook stream parsed before any global JSON body parsing layers
app.post(
    '/api/webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhook
);

// 4. FIXED: Better Auth handler MUST execute BEFORE express.json() parses request bodies
app.use('/api/auth', (req: Request, res: Response) => {
    console.log('incoming auth request:', req.method, req.originalUrl);
    return toNodeHandler(auth)(req, res);
});

// 5. Global body parsers now apply safely to your standard custom endpoints below
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 6. Base monitoring and application routing endpoints
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use('/api/user', userRoutes);
app.use('/api/project', projectRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stack: any[] = (app as any)._router?.stack || [];
        const routes = stack
            .filter((s: any) => s.route || s.name === 'bound dispatch' || s.name === 'router')
            .map((s: any) => {
                if (s.route && s.route.path) return s.route.path;
                if (s.name === 'router' && s.regexp) return s.regexp.toString();
                return s.name;
            });
        console.log('mounted routes:', routes);
    } catch (e) {
        console.error('Error listing routes', e);
    }
});
