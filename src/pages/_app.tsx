import {
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CheckOutlined, UserOutlined } from "@ant-design/icons";
import type { AppProps } from "next/app";
import { Client, Wallet } from "xrpl";
import { Avatar, Dropdown, Select, Spin } from "antd";
import { useRouter } from "next/router";
import { Maybe } from "monet";
import { Web3Storage } from "web3.storage";
import useDidMount from "beautiful-react-hooks/useDidMount";
import useLocalStorage from "beautiful-react-hooks/useLocalStorage";
import Image from "next/image";
import Link from "next/link";
import cls from "classnames";

import {
  XrpLedgerContext,
  DEFAULT_CTX_VALUE,
  NETWORK_PROFILES,
  NetworkProfile,
} from "~/hooks/useXrpLedgerHook";
import { LS_KEY } from "~/consts";

import styles from "./_app.module.css";

import "antd/dist/reset.css";

import "../styles/globals.css";
import "../styles/uno.css";

const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { network, setNetwork, wallet, wallets, setWallet } =
    useContext(XrpLedgerContext);

  return (
    <div className={cls(styles.container, "mx-auto")}>
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
            // todo: also change cilo server network
            onChange={(v) => {
              setNetwork(v);

              // todo: just do reload for state reset
              window.location.href = `${window.location.origin}/`;
            }}
            options={[
              {
                value: "test",
                label: "TestNet",
              },
              {
                value: "dev",
                label: "DevNet",
              },
            ]}
          />
        </div>
        <div>
          <Dropdown
            menu={{
              items: [
                ...wallets.map((_wallet, idx) => {
                  const isActive = wallet.exists(
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
                  key: "create",
                  label: <Link href="/create">Create Account</Link>,
                },
                {
                  type: "divider",
                },
                {
                  key: "dashboard",
                  label: <Link href="/">Dashboard</Link>,
                },
                {
                  key: "nft",
                  label: (
                    <Link
                      href={`/nft/${wallet
                        .map((w) => w.getXAddress())
                        .orSome("")}`}
                    >
                      My NFTs
                    </Link>
                  ),
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
  const [network, setNetwork] = useLocalStorage<NetworkProfile>(
    LS_KEY.NETWORK,
    DEFAULT_CTX_VALUE.network
  );
  const [web3Storage, setWeb3Storage] = useState<Maybe<Web3Storage>>(
    Maybe.None()
  );
  const [client, setClient] = useState<Maybe<Client>>(Maybe.None());
  const [ciloClient, setCiloClient] = useState<Maybe<Client>>(Maybe.None());
  const [wallet, setWallet] = useState<Maybe<Wallet>>(Maybe.None());
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletSeeds] = useLocalStorage<string[]>(
    `${LS_KEY.WALLET_SEEDS}/${network}`,
    []
  );

  useDidMount(() => {
    setWeb3Storage(
      Maybe.Some(
        new Web3Storage({
          token: process.env.NEXT_PUBLIC_WEB3STORAGE_TOKEN as string,
        })
      )
    );
  });

  // reactive logic of walletSeeds
  useEffect(() => {
    const wallets = walletSeeds?.map((seed) => Wallet.fromSeed(seed)) ?? [];

    setWallet(wallets.length > 0 ? Maybe.Some(wallets[0]) : Maybe.None());
    setWallets(wallets);
  }, [walletSeeds]);

  // reactive logic of network states
  useEffect(() => {
    const networkProfile = NETWORK_PROFILES[network ?? "test"];

    const _client = new Client(networkProfile.xrpl);

    _client.connect().then(() => {
      setClient(Maybe.Some(_client));
    });

    return () => {
      _client.disconnect().then(() => {
        setClient(Maybe.None());
      });
    };
  }, [network]);

  useEffect(() => {
    const networkProfile = NETWORK_PROFILES[network ?? "test"];

    const _client = new Client(networkProfile.cilo);

    _client.connect().then(() => {
      setCiloClient(Maybe.Some(_client));
    });

    return () => {
      _client.disconnect().then(() => {
        setCiloClient(Maybe.None());
      });
    };
  }, [network]);

  const ctx = useMemo(() => {
    return {
      web3Storage,
      client,
      ciloClient,
      wallet,
      wallets,
      network: network ?? "test",
      setNetwork,
      setWallet,
      setWallets,
    };
  }, [web3Storage, client, ciloClient, wallet, wallets, network, setNetwork]);

  // @ts-ignore
  const getLayout = Component.getLayout;

  return client.isSome() && ciloClient.isSome() ? (
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
