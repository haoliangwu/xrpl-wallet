import { useEffect, useMemo, useState } from "react";
import type { AppProps } from "next/app";
import { Client, Wallet } from "xrpl";
import { Spin } from "antd";
import { useRouter } from "next/router";
import { Maybe } from "monet";

import {
  XrpLedgerClientProvider,
  DEFAULT_CTX_VALUE,
} from "~/hooks/useXrpLedgerHook";
import { LS_KEY } from "~/consts";

import "antd/dist/reset.css";

import "../styles/globals.css";
import "../styles/uno.css";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [network, setNetwork] = useState(DEFAULT_CTX_VALUE.network);
  const [client, setClient] = useState<Maybe<Client>>(Maybe.None());
  const [wallet, setWallet] = useState<Maybe<Wallet>>(Maybe.None());
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    if (typeof localStorage.getItem(LS_KEY.WALLET_SEEDS) === "string") {
      const seeds = JSON.parse(
        localStorage.getItem(LS_KEY.WALLET_SEEDS) ?? "[]"
      ) as Array<string>;

      const wallets = seeds.map((seed) => Wallet.fromSeed(seed));

      setWallet(Maybe.Some(wallets[0]));
      setWallets(wallets);
    }
  }, [router]);

  useEffect(() => {
    const _client = new Client(network);

    _client.connect().then(() => {
      setClient(Maybe.Some(_client));
    });

    return () => {
      _client.disconnect().then(() => {
        setClient(Maybe.None());
      });
    };
  }, [network]);

  const ctx = useMemo(() => {
    return {
      client,
      wallet,
      wallets,
      network,
      setNetwork,
      setWallet,
      setWallets,
    };
  }, [client, wallet, wallets, network]);

  return client.isSome() ? (
    <XrpLedgerClientProvider.Provider value={ctx}>
      <Component {...pageProps} />
    </XrpLedgerClientProvider.Provider>
  ) : (
    <div className="relative w-100vw h-100vh">
      <div className="absolute top-50% left-50% transform translate-x-[-50%] translate-y-[-50%]">
        <Spin className="m-auto" />
      </div>
    </div>
  );
}

export default MyApp;
