import {
  TransactionMetadata,
  TxResponse,
  Wallet,
  decodeXAddress,
  isValidXAddress,
  isoTimeToRippleTime,
} from "xrpl";

// use 2 ** 30 as the max limit due to parseNFTokenID resolve to minus Taxon in edge-case
// see: https://github.com/XRPLF/xrpl.js/blob/0f02e78d106facbdcc7ddf94e9bb0b68594c9d3c/packages/xrpl/src/utils/parseNFTokenID.ts#L25
export const generateNFTokenTaxon = () =>
  Number.parseInt(String(Math.random() * 2 ** 30));

export const resolveTxExpiration = (offsetInMs: number) =>
  isoTimeToRippleTime(new Date(Date.now() + offsetInMs));

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

export const isTransactionMetadata = (
  meta: any
): meta is TransactionMetadata => {
  return (
    "AffectedNodes" in meta &&
    "TransactionIndex" in meta &&
    "TransactionResult" in meta
  );
};

export const normalizeIpfsExternalLink = (uri: string) => {
  const [cid, name] = uri.split("/");
  return `https://${cid}.ipfs.w3s.link/${name}`;
};
