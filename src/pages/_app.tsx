import { useEffect, useMemo, useState } from "react";
import type { AppProps } from "next/app";
import { Client, Wallet } from "xrpl";
import { Spin } from "antd";
import { useRouter } from "next/router";

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
  const [client, setClient] = useState<Client>();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    if (typeof localStorage.getItem(LS_KEY.WALLET_SEEDS) === "string") {
      const seeds = JSON.parse(
        localStorage.getItem(LS_KEY.WALLET_SEEDS) ?? "[]"
      ) as Array<string>;

      const wallets = seeds.map((seed) => Wallet.fromSeed(seed));

      setWallet(wallets[0]);
      setWallets(wallets);
    } else {
      router.push("/create");
    }
  }, [router]);

  useEffect(() => {
    const _client = new Client(network);

    _client.connect().then(() => {
      setClient(_client);
    });

    return () => {
      _client.disconnect().then(() => {
        setClient(undefined);
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

  return client ? (
    <XrpLedgerClientProvider.Provider value={ctx}>
      <Component {...pageProps} />
    </XrpLedgerClientProvider.Provider>
  ) : (
    <div className="py-45vh text-center">
      <Spin className="m-auto" />
    </div>
  );
}

export default MyApp;
