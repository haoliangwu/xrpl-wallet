export const generateNFTokenTaxon = () =>
  Number.parseInt(String(Math.random() * 2 ** 32));

export const resolveTxExpiration = (offset: number) =>
  Number.parseInt((Date.now() / 1000 + 946684800 + offset).toFixed(0));
