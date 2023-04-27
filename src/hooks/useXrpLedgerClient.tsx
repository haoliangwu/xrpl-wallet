import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
} from "react";
import { Client } from "xrpl";

let client: Client;

export const DEFAULT_CTX_VALUE: {
  client?: Client;
  network: string;
  setNetwork: Dispatch<SetStateAction<string>>;
} = {
  network: "wss://s.altnet.rippletest.net:51233",
  setNetwork: () => {},
};

export const XrpLedgerClientProvider = createContext<{
  client?: Client;
  network: string;
  setNetwork: Dispatch<SetStateAction<string>>;
}>(DEFAULT_CTX_VALUE);

export default function useXrpLedgerClient() {
  const { client, ...others } = useContext(XrpLedgerClientProvider);

  if (!client) {
    throw new Error(
      "No XRP Ledger Client set, use XrpLedgerClientProvider to set one"
    );
  }

  return {
    client,
    ...others,
  };
}
