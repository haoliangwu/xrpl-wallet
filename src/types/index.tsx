import { AccountNFTsResponse } from "xrpl";
import BaseLedgerEntry from "xrpl/dist/npm/models/ledger/BaseLedgerEntry";
import { BaseResponse } from "xrpl/dist/npm/models/methods/baseMethod";

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

export interface CiloNFTokenResponse extends BaseResponse {
  result: {
    flags: number;
    is_burned: boolean;
    issuer: string;
    ledger_index: number;
    nft_id: string;
    nft_sequence: number;
    nft_taxon: number;
    owner: string;
    transfer_fee: number;
    uri: string;
    validated: boolean;
  };
}
