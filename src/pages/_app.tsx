import { useEffect, useMemo, useState } from "react";
import type { AppProps } from "next/app";
import { Client, Wallet } from "xrpl";
import { Spin } from "antd";

import {
  XrpLedgerClientProvider,
  DEFAULT_CTX_VALUE,
} from "~/hooks/useXrpLedgerHook";

import "antd/dist/reset.css";

import "../styles/globals.css";
import "../styles/uno.css";

function MyApp({ Component, pageProps }: AppProps) {
  const [network, setNetwork] = useState(DEFAULT_CTX_VALUE.network);
  const [client, setClient] = useState<Client>();
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    if (typeof localStorage.getItem("__wallet_seed__") === "string") {
      setWallet(
        Wallet.fromSeed(localStorage.getItem("__wallet_seed__") as string)
      );
    }
  }, []);

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
      network,
      setNetwork,
      setWallet,
    };
  }, [client, wallet, network]);

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
