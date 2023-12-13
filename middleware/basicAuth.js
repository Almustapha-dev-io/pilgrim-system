const config = require('config');

const { atob } = require('../util/enc');

module.exports = function (req, res, next) {
  const authCredentials = req.header('Authorization');
  if (!authCredentials)
    return res
      .status(401)
      .json({ error: 'Access denied. credentials not provided' });

  const base64Str = authCredentials.split('Basic')[1];
  if (!base64Str)
    return res.status(401).json({ error: 'Basic authentication not valid' });

  const decoded = atob(base64Str);
  const splitted = decoded.split(':');
  username = splitted[0];
  password = splitted[1];

  if (!username || !password)
    return res.status(401).json({ error: 'Invalid credentials' });
  if (username.toLowerCase() !== config.get('basicAuthUser'))
    return res.status(401).json({ error: 'Invalid credentials' });
  if (password !== config.get('basicAuthPassword'))
    return res.status(401).json({ error: 'Invalid credentials' });
  next();
};
