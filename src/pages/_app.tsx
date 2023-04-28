import {
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckOutlined, UserOutlined } from "@ant-design/icons";
import type { AppProps } from "next/app";
import { Client, Wallet } from "xrpl";
import { Avatar, Dropdown, Select, Spin } from "antd";
import { useRouter } from "next/router";
import { Maybe } from "monet";
import { IPFS, create } from "ipfs-core";

import { XrpLedgerContext, DEFAULT_CTX_VALUE } from "~/hooks/useXrpLedgerHook";
import { LS_KEY } from "~/consts";

import "antd/dist/reset.css";

import "../styles/globals.css";
import "../styles/uno.css";
import Image from "next/image";
import Link from "next/link";

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { network, setNetwork, wallet, wallets, setWallet } =
    useContext(XrpLedgerContext);

  return (
    <div className="w-1000px mx-auto">
      <div className="h-80px flex items-center gap-4">
        <Image
          width={200}
          height={40}
          src="https://xrpl.org/assets/img/XRPLedger_DevPortal-black.svg"
          alt="logo"
        />
        <span className="flex-auto" />
        <div>
          <Select
            value={network}
            onChange={(v) => setNetwork(v)}
            options={[
              {
                value: "wss://s.altnet.rippletest.net:51233",
                label: "TestNet",
              },
              {
                value: "wss://s.devnet.rippletest.net:51233/",
                label: "DevNet",
                disabled: true,
              },
            ]}
          />
        </div>
        <div>
          <Dropdown
            menu={{
              items: [
                ...wallets.map((_wallet, idx) => {
                  const isActive = wallet.every(
                    (w) => w.address === _wallet.address
                  );

                  return {
                    key: _wallet.address,
                    label: (
                      <div
                        className="flex items-center"
                        onClick={() => {
                          setWallet(Maybe.Some(_wallet));
                        }}
                      >
                        <span className="flex-auto">Account {idx + 1}</span>
                        {isActive && <CheckOutlined />}
                      </div>
                    ),
                  };
                }),
                {
                  type: "divider",
                },
                {
                  key: "create",
                  label: <Link href="/create">Create Account</Link>,
                },
              ],
            }}
          >
            <Avatar size="large" icon={<UserOutlined />} />
          </Dropdown>
        </div>
      </div>
      <div className="relative bg-#ffffff px-8 py-6 rounded-8px">
        {children}
      </div>
    </div>
  );
};

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [network, setNetwork] = useState(DEFAULT_CTX_VALUE.network);
  const [ipfs, setIpfs] = useState<Maybe<IPFS>>(Maybe.None());
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

  const initIpfsOnce = useRef(false);

  useEffect(() => {
    if (ipfs.isSome() || initIpfsOnce.current) return;

    initIpfsOnce.current = true;

    create().then((ipfs) => {
      setIpfs(Maybe.Some(ipfs));
    });
  }, [ipfs]);

  const ctx = useMemo(() => {
    return {
      ipfs,
      client,
      wallet,
      wallets,
      network,
      setNetwork,
      setWallet,
      setWallets,
    };
  }, [ipfs, client, wallet, wallets, network]);

  // @ts-ignore
  const getLayout = Component.getLayout;

  return client.isSome() ? (
    <XrpLedgerContext.Provider value={ctx}>
      {getLayout ? (
        getLayout(<Component {...pageProps} />)
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </XrpLedgerContext.Provider>
  ) : (
    <div className="relative w-100vw h-100vh">
      <div className="absolute top-50% left-50% transform translate-x-[-50%] translate-y-[-50%]">
        <Spin className="m-auto" />
      </div>
    </div>
  );
}

export default MyApp;
