import { useRouter } from "next/router";
import { Dispatch, SetStateAction, createContext, useContext } from "react";
import { Client, Wallet } from "xrpl";
import { Maybe } from "monet";
import { Web3Storage } from "web3.storage";

export type NetworkProfile = "dev" | "test";

export const NETWORK_PROFILES: {
  [k in NetworkProfile]: {
    xrpl: string;
    cilo: string;
  };
} = {
  dev: {
    xrpl: "wss://s.devnet.rippletest.net:51233/",
    cilo: "wss://clio.devnet.rippletest.net:51233/",
  },
  test: {
    xrpl: "wss://s.altnet.rippletest.net:51233",
    cilo: "wss://clio.altnet.rippletest.net:51233",
  },
};

interface XrpLedgerContext {
  web3Storage: Maybe<Web3Storage>;
  client: Maybe<Client>;
  ciloClient: Maybe<Client>;
  wallet: Maybe<Wallet>;
  wallets: Wallet[];
  network: NetworkProfile;
  setNetwork: Dispatch<SetStateAction<NetworkProfile>>;
  setWallet: Dispatch<SetStateAction<Maybe<Wallet>>>;
  setWallets: Dispatch<SetStateAction<Wallet[]>>;
}

export const DEFAULT_CTX_VALUE: XrpLedgerContext = {
  web3Storage: Maybe.None(),
  client: Maybe.None(),
  ciloClient: Maybe.None(),
  wallet: Maybe.None(),
  network: "test",
  wallets: [],
  setNetwork: () => {},
  setWallet: () => {},
  setWallets: () => {},
};

export const XrpLedgerContext =
  createContext<XrpLedgerContext>(DEFAULT_CTX_VALUE);

export function useXrpLedgerClient() {
  const { client, ciloClient, network, setNetwork } =
    useContext(XrpLedgerContext);

  return {
    client,
    ciloClient,
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

export function useWeb3Storage() {
  const { web3Storage } = useContext(XrpLedgerContext);

  return {
    web3Storage,
  };
}
