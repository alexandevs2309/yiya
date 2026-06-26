import { openDB } from "idb";

const DB_NAME = "diyiya-crypto-keys";
const STORE_NAME = "keys";
const KEY_ID = "session-key";

/**
 * Obtiene o genera una CryptoKey AES-GCM por dispositivo.
 * La clave se almacena en IndexedDB y NO es extraíble desde JS.
 */
async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });

  const existing = await db.get(STORE_NAME, KEY_ID);
  if (existing) return existing;

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // non-extractable — no se puede leer la clave raw desde DevTools
    ["encrypt", "decrypt"],
  );

  await db.put(STORE_NAME, key, KEY_ID);
  return key;
}

// Cache de la clave en memoria para evitar abrir IndexedDB en cada operación
let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = await getOrCreateKey();
  }
  return cachedKey;
}

/**
 * Cifra un string con AES-256-GCM.
 * Retorna Base64 de (IV de 12 bytes || ciphertext).
 */
export async function encryptSession(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  // Concatenar IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Descifra un string cifrado con AES-256-GCM.
 */
export async function decryptSession(cipherB64: string): Promise<string> {
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    // Si la desencriptación falla (clave cambiada, datos corruptos), retorna vacío
    // Esto fuerza un re-login, que es el comportamiento correcto
    return "";
  }
}

