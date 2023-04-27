import { useRouter } from "next/router";
import { Dispatch, SetStateAction, createContext, useContext } from "react";
import { Client, Wallet } from "xrpl";

let client: Client;

interface XrpLedgerContext {
  client?: Client;
  wallet?: Wallet;
  wallets: Wallet[];
  network: string;
  setNetwork: Dispatch<SetStateAction<string>>;
  setWallet: Dispatch<SetStateAction<Wallet | undefined>>;
  setWallets: Dispatch<SetStateAction<Wallet[]>>;
}

export const DEFAULT_CTX_VALUE: XrpLedgerContext = {
  network: "wss://s.altnet.rippletest.net:51233",
  wallets: [],
  setNetwork: () => {},
  setWallet: () => {},
  setWallets: () => {},
};

export const XrpLedgerClientProvider =
  createContext<XrpLedgerContext>(DEFAULT_CTX_VALUE);

export function useXrpLedgerClient() {
  const { client, network, setNetwork } = useContext(XrpLedgerClientProvider);

  if (!client) {
    throw new Error(
      "No XRP Ledger Client set, use XrpLedgerClientProvider to set one"
    );
  }

  return {
    client,
    network,
    setNetwork,
  };
}

export function useXrpLedgerWallet() {
  const router = useRouter();
  const { wallet, wallets, setWallet, setWallets } = useContext(
    XrpLedgerClientProvider
  );

  if (!wallet) {
    router.push("/create");

    throw new Error("No XRP Ledger Wallet set, please create it.");
  }

  return {
    wallet,
    wallets,
    setWallet,
    setWallets,
  };
}
