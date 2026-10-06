// Service-access authorization middleware.
//
// checkServiceAccess('international') — requires user.can_use_international
// checkServiceAccess('domestic')      — requires user.can_use_domestic
//
// Works for both auth styles used by this API:
//   - API-key routes: authenticateApiKey runs first and attaches req.apiUser.
//   - JWT (Bearer) routes: the user is loaded here from the JWT subject.
//
// Admins (role='admin') bypass the check — they manage the flags themselves.
// A denial returns 403 with a clear, user-facing message.
import pocketbaseClient from '../utils/pocketbaseClient.js';

function decodeCaller(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    );
    return { id: payload.id, role: payload.role || '' };
  } catch (_) {
    return null;
  }
}

export function checkServiceAccess(serviceType) {
  return async (req, res, next) => {
    let user = req.apiUser;

    if (!user) {
      const caller = decodeCaller(req);
      if (!caller?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      try {
        user = await pocketbaseClient
          .collection('users')
          .getOne(caller.id, { $autoCancel: false });
      } catch (_) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Admins manage the flags themselves and may use any service.
    if (user.role === 'admin') return next();

    const flag =
      serviceType === 'international'
        ? 'can_use_international'
        : 'can_use_domestic';

    if (!user[flag]) {
      const label =
        serviceType === 'international' ? 'International SMS' : 'Domestic SMS';
      return res.status(403).json({
        error: `${label} not enabled for your account. Contact admin.`,
      });
    }

    next();
  };
}

export default checkServiceAccess;
