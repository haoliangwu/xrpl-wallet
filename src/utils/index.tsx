import { Wallet, decodeXAddress, isValidXAddress } from "xrpl";

export const generateNFTokenTaxon = () =>
  Number.parseInt(String(Math.random() * 2 ** 32));

export const resolveTxExpiration = (offset: number) =>
  Number.parseInt((Date.now() / 1000 + 946684800 + offset).toFixed(0));

export const normalizeNFTokenTransferFee = (fee: number) => {
  return (fee * 0.001).toFixed(3) + " %";
};

export const parseAccountId = (walletOrXAddress: Wallet | string) => {
  const isAddress = typeof walletOrXAddress === "string";

  if (isAddress) {
    if (!isValidXAddress(walletOrXAddress))
      throw new Error("only support x-address format");

    return decodeXAddress(walletOrXAddress)
      .accountId.toString("hex")
      .toLocaleUpperCase();
  } else {
    return decodeXAddress(walletOrXAddress.getXAddress())
      .accountId.toString("hex")
      .toLocaleUpperCase();
  }
};

export const percentFormat = (s: number, precision: number = 2) =>
  (s / 10 ** precision).toFixed(precision) + " %";
