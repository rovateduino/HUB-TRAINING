const rateLimit = require('express-rate-limit');

const WINDOW_15M = 15 * 60 * 1000;

module.exports = {
  authLoginLimiter: rateLimit({
    windowMs: WINDOW_15M,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.', code: 'RATE_LIMITED' },
  }),
  authRegisterLimiter: rateLimit({
    windowMs: WINDOW_15M,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.', code: 'RATE_LIMITED' },
  }),
  authResetLimiter: rateLimit({
    windowMs: WINDOW_15M,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitos pedidos de recuperação. Tente novamente em alguns minutos.', code: 'RATE_LIMITED' },
  }),
  apiReadLimiter: rateLimit({
    windowMs: WINDOW_15M,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Limite de requisições excedido.', code: 'RATE_LIMITED' },
  }),
  apiWriteLimiter: rateLimit({
    windowMs: WINDOW_15M,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Limite de requisições excedido.', code: 'RATE_LIMITED' },
  }),
  // @deprecated — mantido por compatibilidade; use apiReadLimiter/apiWriteLimiter.
  apiGlobalLimiter: rateLimit({
    windowMs: WINDOW_15M,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Limite de requisições excedido.', code: 'RATE_LIMITED' },
  }),
};
