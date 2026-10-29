const { AppError } = require('../utils/errors');
// validate(schema, 'body' | 'query' | 'params')
module.exports =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const r = schema.safeParse(req[source]);
    if (!r.success) return next(new AppError(400, 'Validasi gagal', r.error.flatten().fieldErrors));
    req[source] = r.data;
    next();
  };
