import { Wallet, decodeXAddress } from "xrpl";

export const generateNFTokenTaxon = () =>
  Number.parseInt(String(Math.random() * 2 ** 32));

export const resolveTxExpiration = (offset: number) =>
  Number.parseInt((Date.now() / 1000 + 946684800 + offset).toFixed(0));

export const parseNFTokenId = (s: string) => {
  return {
    flags: Number.parseInt(s.slice(0, 4), 16),
    fee: normalizeNFTokenTransferFee(Number.parseInt(s.slice(4, 8), 16)),
    issuer: s.slice(8, 48),
    taxon: Number.parseInt(s.slice(48, 56), 16),
    seq: Number.parseInt(s.slice(56), 16),
  };
};

export const normalizeNFTokenTransferFee = (fee: number) => {
  return ((fee * 0.01) / 100).toFixed(2) + " %";
};

export const parseAccountId = (wallet: Wallet) => {
  return decodeXAddress(wallet.getXAddress())
    .accountId.toString("hex")
    .toLocaleUpperCase();
};
