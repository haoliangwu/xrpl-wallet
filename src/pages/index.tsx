import { useCallback, useEffect, useState } from "react";
import { CheckOutlined, SmileOutlined } from "@ant-design/icons";
import {
  Select,
  Avatar,
  Typography,
  Divider,
  Button,
  Dropdown,
  Result,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import Image from "next/image";
import {
  AccountInfoResponse,
  dropsToXrp,
  TransactionStream,
  AccountTxResponse,
  Payment,
  Client,
} from "xrpl";
import { useRouter } from "next/router";
import { Maybe } from "monet";

import {
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [account, setAccount] =
    useState<AccountInfoResponse["result"]["account_data"]>();

  const { client, network, setNetwork } = useXrpLedgerClient();
  const { wallet, wallets, setWallet } = useXrpLedgerWallet();
  const [txHistory, setTxHistory] = useState<
    AccountTxResponse["result"]["transactions"]
  >([]);

  const syncAccountInfo = useCallback(() => {
    client
      .ap(
        wallet.map(
          (w) => (c: Client) =>
            c.request({
              command: "account_info",
              account: w.address,
              ledger_index: "validated",
            })
        )
      )
      .forEach((defer) => {
        defer.then(({ result }) => {
          setAccount(result.account_data);
        });
      });
  }, [client, wallet]);

  const syncAccountTxHistory = useCallback(() => {
    client
      .ap(
        wallet.map(
          (w) => (c: Client) =>
            c.request({
              command: "account_tx",
              account: w.address,
            })
        )
      )
      .forEach((defer) => {
        defer.then((res) => {
          setTxHistory(res.result.transactions);
        });
      });
  }, [client, wallet]);

  // init logic when comp is mounted
  useEffect(() => {
    syncAccountInfo();
    syncAccountTxHistory();
  }, [client, router, syncAccountInfo, syncAccountTxHistory]);

  // real-time subscription
  useEffect(() => {
    if (wallets.length <= 0) return;

    const handler = async (ts: TransactionStream) => {
      syncAccountInfo();
      syncAccountTxHistory();
    };

    client.forEach((c) => {
      c.request({
        command: "subscribe",
        accounts: wallets.map((wallet) => wallet.address),
      });
      c.on("transaction", handler);
    });

    return () => {
      client.forEach((c) => {
        c.request({
          command: "unsubscribe",
          accounts: wallets.map((wallet) => wallet.address),
        });
        c.off("transaction", handler);
      });
    };
  }, [client, wallets, syncAccountInfo, syncAccountTxHistory]);

  return wallet.isSome() ? (
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
      <div className="bg-#ffffff p-4">
        <div className="h-64px text-center">
          <Typography.Title level={4}>Address</Typography.Title>
          <Typography.Text copyable>
            {wallet.cata(
              () => "-",
              (w) => w.address
            )}
          </Typography.Text>
        </div>
        <Divider />
        <div className="flex flex-col items-center">
          <Typography.Title level={4}>Balance</Typography.Title>
          <div>
            {account?.Balance ? dropsToXrp(account.Balance) : "-"}
            <span className="ml-1">XRP</span>
          </div>
          <div className="flex gap-4 mt-4">
            <Button
              type="primary"
              onClick={() => {
                router.push("/send-tx");
              }}
            >
              Send
            </Button>
          </div>
        </div>
        <Divider />
        <div className="flex flex-col items-center">
          <Typography.Title level={4}>History</Typography.Title>
          <div className="w-full max-h-500px overflow-y-auto ">
            {txHistory.map(({ tx }) => {
              const isRecipient = wallet.every(
                (w) => w.address === (tx as Payment).Destination
              );

              return (
                <div
                  className="px-4 py-2 border-b-1 border-b-#d6d9dc border-b-solid"
                  key={tx?.hash}
                >
                  <div className="flex">
                    <span className="mr-2">
                      {isRecipient ? "Received" : "Sent"}:
                    </span>
                    <span className="flex-auto"></span>
                    <Typography.Text>
                      {dropsToXrp((tx as Payment).Amount.toString())} XRP
                    </Typography.Text>
                  </div>
                  <div className="flex">
                    <span className="mr-2">Tx Hash:</span>
                    <span className="flex-auto"></span>
                    <Typography.Text copyable={{ text: tx?.hash }}>
                      {tx?.hash}
                    </Typography.Text>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="relative w-100vw h-100vh">
      <div className="absolute top-50% left-50% transform translate-x-[-50%] translate-y-[-50%]">
        <Result
          icon={<SmileOutlined />}
          title="Oops, it seems you don't have account yet!"
          extra={
            <Button type="primary" onClick={() => router.push("/create")}>
              Create
            </Button>
          }
        />
      </div>
    </div>
  );
}
