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

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.post(
    '/api/webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhook
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// quick health check route
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Forward requests under /api/auth to the Better Auth handler
app.use('/api/auth', (req: Request, res: Response, next) => {
    console.log('incoming auth request:', req.method, req.originalUrl);
    return toNodeHandler(auth)(req, res);
});

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use('/api/user', userRoutes);
app.use('/api/project', projectRouter);


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    // debug: list registered routes/layers
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