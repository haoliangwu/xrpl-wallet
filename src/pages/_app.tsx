import { useEffect, useMemo, useState } from "react";
import type { AppProps } from "next/app";
import { Client } from "xrpl";
import { Spin } from "antd";

import {
  XrpLedgerClientProvider,
  DEFAULT_CTX_VALUE,
} from "~/hooks/useXrpLedgerClient";

import "antd/dist/reset.css";

import "../styles/globals.css";
import "../styles/uno.css";

function MyApp({ Component, pageProps }: AppProps) {
  const [network, setNetwork] = useState(DEFAULT_CTX_VALUE.network);
  const [client, setClient] = useState<Client>();

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
      network,
      setNetwork,
    };
  }, [client, network]);

  return client ? (
    <XrpLedgerClientProvider.Provider value={ctx}>
      <Component {...pageProps} />;
    </XrpLedgerClientProvider.Provider>
  ) : (
    <div className="py-45vh text-center">
      <Spin className="m-auto" />
    </div>
  );
}

export default MyApp;
