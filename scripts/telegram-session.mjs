// Creates TELEGRAM_SESSION_STRING for the support Telegram account
// (@Nezeriya_Support). Run on your own computer, never on the server:
//
//   npm install
//   node scripts/telegram-session.mjs
//
// It asks for TELEGRAM_API_ID and TELEGRAM_API_HASH (from my.telegram.org,
// signed in as the support account), the phone number, the login code and
// the 2FA password if one is set, then prints the session string. Put the
// three values into the Render service's Environment and redeploy.
// The session string is a full login to the account: do not share it.
import input from "input";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = Number(process.env.TELEGRAM_API_ID || await input.text("TELEGRAM_API_ID: "));
const apiHash = process.env.TELEGRAM_API_HASH || await input.text("TELEGRAM_API_HASH: ");
const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 3 });
await client.start({
  phoneNumber: () => input.text("Phone number of the support account (+380…): "),
  phoneCode: () => input.text("Code from Telegram: "),
  password: () => input.password("2FA password (Enter if none): "),
  onError: (error) => console.error(error),
});
const me = await client.getMe();
console.log(`\nSigned in as @${me.username || me.firstName}.\n\nTELEGRAM_SESSION_STRING=${client.session.save()}\n`);
await client.disconnect();
process.exit(0);
