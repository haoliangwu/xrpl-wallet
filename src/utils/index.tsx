import BigNumber from "bignumber.js";

export const dropsToXRP = (drops: string) =>
  new BigNumber(drops).multipliedBy(0.000001);
