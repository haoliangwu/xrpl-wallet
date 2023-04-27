import { useCallback, useEffect, useState } from "react";
import { CheckOutlined } from "@ant-design/icons";
import {
  Select,
  Avatar,
  Typography,
  Divider,
  Button,
  Dropdown,
  MenuProps,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import Image from "next/image";
import {
  Wallet,
  AccountInfoResponse,
  dropsToXrp,
  TransactionStream,
  AccountTxResponse,
  Payment,
} from "xrpl";
import { useRouter } from "next/router";

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
      .request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated",
      })
      .then(({ result }) => {
        setAccount(result.account_data);
      });
  }, [client, wallet]);

  const syncAccountTxHistory = useCallback(() => {
    client
      .request({
        command: "account_tx",
        account: wallet.address,
      })
      .then((res) => {
        setTxHistory(res.result.transactions);
      });
  }, [client, wallet]);

  // init logic when comp is mounted
  useEffect(() => {
    if (!wallet) {
      router.push("/create");
      return;
    }

    syncAccountInfo();
  }, [client, router, syncAccountInfo, wallet]);

  useEffect(() => {
    syncAccountTxHistory();
  }, [syncAccountTxHistory]);

  // real-time subscription
  useEffect(() => {
    const handler = async (ts: TransactionStream) => {
      syncAccountInfo();
      syncAccountTxHistory();
    };

    client.request({
      command: "subscribe",
      accounts: wallets.map((wallet) => wallet.address),
    });
    client.on("transaction", handler);

    return () => {
      client.request({
        command: "unsubscribe",
        accounts: wallets.map((wallet) => wallet.address),
      });
      client.off("transaction", handler);
    };
  }, [client, wallets, syncAccountInfo, syncAccountTxHistory]);

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
                  const isActive = _wallet.address === wallet.address;
                  return {
                    key: _wallet.address,
                    label: (
                      <div
                        className="flex items-center"
                        onClick={() => {
                          setWallet(_wallet);
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
          <Typography.Text copyable>{wallet?.address}</Typography.Text>
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
              const isRecipient =
                (tx as Payment).Destination === wallet.address;

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
  );
}
