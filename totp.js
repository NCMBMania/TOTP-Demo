const speakeasy = require('speakeasy');
const applicationKey = 'YOUR_APPLICATION_KEY';
const clientKey = 'YOUR_CLIENT_KEY';
const ncmb = new NCMB(applicationKey, clientKey);

module.exports = async (req, res) => {
  const userName = 'admin';
  const password = 'admin';
  await ncmb.User.login(userName, password);
  
  const authcode = req.body.code;
  const Secret = ncmb.DataStore('Secret');
  const secret = await Secret
    .equalTo('userId', req.body.user_id)
    .fetch();
  if (!secret.objectId) {
    return res.status(404).json({message: `User not found. ${req.body.user_id}`});
  }
  const verified = speakeasy.totp.verify({
    secret: secret.secret,
    encoding: 'ascii',
    token: authcode
  });
  if (verified) {
    return res.status(200).json({message: 'Verified.'});
  } else {
    return res.status(401).json({message: 'Failed.'});
  }
}
