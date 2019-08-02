const speakeasy = require('speakeasy');
const NCMB = require('ncmb');
const applicationKey = 'YOUR_APPLICATION_KEY';
const clientKey = 'YOUR_CLIENT_KEY';
const ncmb = new NCMB(applicationKey, clientKey);

const signUpOrLogin = async () => {
  // 既にログイン済みであれば何もしない
  if (ncmb.User.getCurrentUser()) return;
  // ユーザ作成
  const userName = 'user';
  const password = 'password';
  const user = new ncmb.User();
  try {
    await user.set('userName', userName)
        .set('password', password)
        .signUpByAccount();
  } catch (e) {
    // エラーまたはすでに登録済み
  }
  await ncmb.User.login(userName, password);
}

const createOrFindSecret = async (name, issuer, length) => {
  const user = ncmb.User.getCurrentUser();
  if (!user) throw new Error("You're not logged in");
  const Secret = ncmb.DataStore('Secret');
  try {
    const secret = await Secret
      .equalTo('userId', user.objectId)
      .fetch();
    console.log('secret', secret);
    if (secret.objectId) {
      return secret.secret;
    }
  } catch (e) {
    throw e;
  }
  const secret = new Secret;
  const string = speakeasy.generateSecret({ name, issuer, length });
  const acl = new ncmb.Acl;
  acl
    .setUserReadAccess(user, true)
    .setUserWriteAccess(user, true)
    .setRoleReadAccess('Admin', true);
  await secret
    .set('secret', string.ascii)
    .set('userId', user.objectId)
    .set('acl', acl)
    .save();
  return string.ascii;
}

const generateQRCode = (name, issuer, length, secret) => {
  const url = speakeasy.otpauthURL({
    secret: secret,
    label: encodeURIComponent(name),
    issuer: issuer
  });
  new QRCode(document.getElementById("qrcode"), url);
}

document.addEventListener('DOMContentLoaded', async (e) => {
  try {
    const name = 'my.app';
    const issuer = 'myapp';
    const length = 20;
    
    await signUpOrLogin();
    const secret = await createOrFindSecret(name, issuer, length);
    generateQRCode(name, issuer, length, secret);
  } catch (e) {
    console.log(e);
    return;
  }
  document.getElementById("verify").onclick = async (e) => {
    const user = ncmb.User.getCurrentUser();
    if (!user) throw new Error("You're not logged in");
    const authcode = document.getElementById("code").value;
    try {
      const response = await ncmb.Script
        .data({
          user_id: user.objectId,
          code: authcode
        }) 
        .exec('POST', 'totp.js');
      document.getElementById("result").innerHTML = 'Verified.';
    } catch (e) {
      document.getElementById("result").innerHTML = 'Failed.';
    }
  }
});
