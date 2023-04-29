import { useCallback, useEffect, useState } from "react";
import { SmileOutlined } from "@ant-design/icons";
import { Typography, Divider, Button, Result } from "antd";
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
import Link from "next/link";

import {
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { hexDecode } from "~/utils";

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
    wallet
      .map(
        (w) => (c: Client) =>
          c.request({
            command: "account_info",
            account: w.address,
            ledger_index: "validated",
          })
      )
      .apTo(client)
      .forEach((defer) => {
        defer.then(({ result }) => {
          setAccount(result.account_data);
        });
      });
  }, [client, wallet]);

  const syncAccountTxHistory = useCallback(() => {
    wallet
      .map(
        (w) => (c: Client) =>
          c.request({
            command: "account_tx",
            account: w.address,
          })
      )
      .apTo(client)
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
  }, [syncAccountInfo, syncAccountTxHistory]);

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
    <>
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
            Send Tx
          </Button>
          <Button
            type="primary"
            onClick={() => {
              router.push("/nft/create");
            }}
          >
            Mint NFT
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
                  <span className="mr-2">{tx?.TransactionType}</span>
                  <span className="flex-auto"></span>
                  {tx?.TransactionType === "Payment" && (
                    <Typography.Text>
                      {dropsToXrp(tx.Amount.toString())} XRP (
                      {isRecipient ? "Received" : "Sent"})
                    </Typography.Text>
                  )}
                  {tx?.TransactionType === "NFTokenMint" && (
                    <Typography.Text copyable>
                      {hexDecode(tx.URI ?? "-")}
                    </Typography.Text>
                  )}
                </div>
                <div className="flex">
                  <span className="mr-2">Tx Hash</span>
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
    </>
  ) : (
    <Result
      icon={<SmileOutlined />}
      title="Oops, it seems you don't have account yet!"
      extra={
        <Button type="primary" onClick={() => router.push("/create")}>
          Create
        </Button>
      }
    />
  );
}
