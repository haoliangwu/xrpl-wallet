import { Wallet, decodeXAddress } from "xrpl";

export const generateNFTokenTaxon = () =>
  Number.parseInt(String(Math.random() * 2 ** 32));

export const resolveTxExpiration = (offset: number) =>
  Number.parseInt((Date.now() / 1000 + 946684800 + offset).toFixed(0));

export const normalizeNFTokenTransferFee = (fee: number) => {
  return (fee * 0.001).toFixed(3) + " %";
};

export const parseAccountId = (wallet: Wallet) => {
  return decodeXAddress(wallet.getXAddress())
    .accountId.toString("hex")
    .toLocaleUpperCase();
};

export const percentFormat = (s: number, precision: number = 2) =>
  (s / 10 ** precision).toFixed(precision) + " %";
