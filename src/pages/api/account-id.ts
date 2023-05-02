// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { createHash } from "crypto";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { pubKey } = req.query;

  if (!pubKey) return res.status(400).json({ error: "lack of pubKey" });

  const pubKeyBf = Buffer.from(pubKey as string, "hex");

  const pubkey_inner_hash = createHash("sha256").update(pubKeyBf);
  const pubkey_outer_hash = createHash("ripemd160");
  pubkey_outer_hash.update(pubkey_inner_hash.digest());
  const account_id = pubkey_outer_hash.digest();

  res.status(200).json({ account_id: account_id.toString('hex').toUpperCase() });
}
