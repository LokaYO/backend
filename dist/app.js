import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENV } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { errorHandler, asyncHandler } from "./middlewares/error.middleware.js";
import { globalApiLimiter } from "./middlewares/rateLimit.middleware.js";
import * as publicController from "./controllers/public.controller.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../public/uploads");
export function createApp() {
    const app = express();
    // Trust proxy for reverse proxies (Nginx / Cloudflare) to ensure correct req.protocol and secure URLs
    app.set("trust proxy", 1);
    // Core Middlewares (Full Dynamic Wildcard CORS untuk seluruh subdomain toko/merchant)
    app.use(cors({
        origin: (requestOrigin, callback) => {
            // Request internal/curl/mobile tanpa header origin selalu diizinkan
            if (!requestOrigin)
                return callback(null, true);
            // Jika diset '*' di env
            if (ENV.CORS_ORIGIN.includes("*")) {
                return callback(null, true);
            }
            // Otomatis izinkan seluruh subdomain dinamis (*.ruuby.my.id, *.loka.id, Firebase, dll)
            const isAllowedOrigin = requestOrigin.includes("ruuby.my.id") ||
                requestOrigin.includes("ruubia.my.id") ||
                requestOrigin.includes("loka.id") ||
                requestOrigin.endsWith(".web.app") ||
                requestOrigin.endsWith(".firebaseapp.com") ||
                requestOrigin.includes("localhost") ||
                requestOrigin.includes("127.0.0.1") ||
                ENV.CORS_ORIGIN.some((allowed) => {
                    try {
                        const allowedHost = new URL(allowed).hostname;
                        const reqHost = new URL(requestOrigin).hostname;
                        return reqHost === allowedHost || reqHost.endsWith(`.${allowedHost}`);
                    }
                    catch {
                        return false;
                    }
                });
            if (isAllowedOrigin) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
    }));
    app.use(morgan("dev"));
    app.use(express.json({ limit: "10mb" }));
    // Static files for uploads (Direct Image Serving)
    app.use("/uploads", express.static(uploadDir));
    // Global Rate Limiting for all API Endpoints
    app.use("/api", globalApiLimiter);
    // Direct Share Link & Social Crawler handler for /s/:slug and /sites/:slug
    app.get("/s/:slug", asyncHandler(publicController.renderSharePage));
    app.get("/sites/:slug/share", asyncHandler(publicController.renderSharePage));
    // Root Welcome Route
    app.get("/", (_req, res) => {
        res.json({
            message: "🚀 LOKA Backend API Server is running",
            version: "1.0.0",
            docs: "/api/templates",
            health: "/api/health",
        });
    });
    // Mount Modular API Routes
    app.use("/api", apiRouter);
    // Global Error Handler
    app.use(errorHandler);
    return app;
}
