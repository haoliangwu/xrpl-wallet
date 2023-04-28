import { useRouter } from "next/router";
import { Dispatch, SetStateAction, createContext, useContext } from "react";
import { Client, Wallet } from "xrpl";
import { Maybe } from "monet";
import { IPFS } from "ipfs-core";

let client: Client;

interface XrpLedgerContext {
  ipfs: Maybe<IPFS>;
  client: Maybe<Client>;
  wallet: Maybe<Wallet>;
  wallets: Wallet[];
  network: string;
  setNetwork: Dispatch<SetStateAction<string>>;
  setWallet: Dispatch<SetStateAction<Maybe<Wallet>>>;
  setWallets: Dispatch<SetStateAction<Wallet[]>>;
}

export const DEFAULT_CTX_VALUE: XrpLedgerContext = {
  ipfs: Maybe.None(),
  client: Maybe.None(),
  wallet: Maybe.None(),
  network: "wss://s.altnet.rippletest.net:51233",
  wallets: [],
  setNetwork: () => {},
  setWallet: () => {},
  setWallets: () => {},
};

export const XrpLedgerContext =
  createContext<XrpLedgerContext>(DEFAULT_CTX_VALUE);

export function useXrpLedgerClient() {
  const { client, network, setNetwork } = useContext(XrpLedgerContext);

  return {
    client,
    network,
    setNetwork,
  };
}

export function useXrpLedgerWallet() {
  const { wallet, wallets, setWallet, setWallets } =
    useContext(XrpLedgerContext);

  return {
    wallet,
    wallets,
    setWallet,
    setWallets,
  };
}

export function useIPFS() {
  const { ipfs } = useContext(XrpLedgerContext);

  return {
    ipfs,
  };
}
