export function errorHandler(err, _req, res, _next) {
    console.error('Unhandled Application Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(status).json({
        error: message,
        isSuspended: Boolean(err.isSuspended),
        suspendReason: err.suspendReason || null,
        isDraft: Boolean(err.isDraft),
        details: err.details || {
            isSuspended: Boolean(err.isSuspended),
            suspendReason: err.suspendReason || null,
            isDraft: Boolean(err.isDraft),
        },
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
}
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
