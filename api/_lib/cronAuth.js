function getHeader(req, name) {
  const direct = req.headers?.[name.toLowerCase()];
  return Array.isArray(direct) ? direct[0] : String(direct || '');
}

export function assertCronAuthorized(req, { codePrefix = 'cron' } = {}) {
  const expectedSecret = String(process.env.CRON_SECRET || '').trim();
  const authorization = getHeader(req, 'authorization');
  const vercelCronHeader = getHeader(req, 'x-vercel-cron');
  const isVercelCron = vercelCronHeader === '1' || vercelCronHeader.toLowerCase() === 'true';

  if (expectedSecret && authorization === `Bearer ${expectedSecret}`) {
    return { ok: true, mode: 'secret' };
  }

  if (isVercelCron) {
    return { ok: true, mode: 'vercel-cron' };
  }

  if (!expectedSecret) {
    return {
      ok: false,
      status: 503,
      code: `${codePrefix}/cron-secret-missing`,
      message: 'CRON_SECRET doit etre configure cote serveur.'
    };
  }

  return {
    ok: false,
    status: 401,
    code: `${codePrefix}/unauthorized`,
    message: 'Execution non autorisee.'
  };
}
