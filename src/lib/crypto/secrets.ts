import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string) {
  const [, ivText, authTagText, encryptedText] = payload.split(".");
  if (!ivText || !authTagText || !encryptedText) {
    throw new Error("Invalid encrypted secret payload.");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey() {
  // SECRET_ENCRYPTION_KEY is the canonical name; fall back to old name for existing deployments
  const secret = process.env.SECRET_ENCRYPTION_KEY ?? process.env.LODGIFY_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Set SECRET_ENCRYPTION_KEY to at least 32 random characters.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}
