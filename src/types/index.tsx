import { AccountNFTsResponse } from "xrpl";
import BaseLedgerEntry from "xrpl/dist/npm/models/ledger/BaseLedgerEntry";

export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export type NFToken = Pick<
  ArrayElement<AccountNFTsResponse["result"]["account_nfts"]>,
  "NFTokenID" | "URI"
>;

export interface NFTokenPage extends BaseLedgerEntry {
  LedgerEntryType: "NFTokenPage";
  NFTokens: Array<{ NFToken: NFToken }>;
  NextPageMin?: string;
  PreviousPageMin?: string;
  PreviousTxnID?: string;
  PreviousTxnLgrSeq?: number;
}
