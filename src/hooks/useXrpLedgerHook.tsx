import { useRouter } from "next/router";
import { Dispatch, SetStateAction, createContext, useContext } from "react";
import { Client, Wallet } from "xrpl";
import { Maybe } from "monet";

let client: Client;

interface XrpLedgerContext {
  client: Maybe<Client>;
  wallet: Maybe<Wallet>;
  wallets: Wallet[];
  network: string;
  setNetwork: Dispatch<SetStateAction<string>>;
  setWallet: Dispatch<SetStateAction<Maybe<Wallet>>>;
  setWallets: Dispatch<SetStateAction<Wallet[]>>;
}

export const DEFAULT_CTX_VALUE: XrpLedgerContext = {
  client: Maybe.None(),
  wallet: Maybe.None(),
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

  return {
    wallet,
    wallets,
    setWallet,
    setWallets,
  };
}
