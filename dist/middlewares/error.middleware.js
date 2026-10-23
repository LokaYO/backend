export function errorHandler(err, _req, res, _next) {
    console.error('Unhandled Application Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
}
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
