import { useCallback, useEffect, useState } from "react";
import { SmileOutlined } from "@ant-design/icons";
import {
  Typography,
  Divider,
  Button,
  Result,
  Descriptions,
  Skeleton,
} from "antd";
import {
  AccountInfoResponse,
  dropsToXrp,
  AccountTxResponse,
  Payment,
  Client,
  convertHexToString,
  AccountNFTsResponse,
} from "xrpl";
import { useRouter } from "next/router";
import { Maybe } from "monet";
import InfiniteScroll from "react-infinite-scroll-component";

import {
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import ScannerText from "~/components/ScannerText";
import { parseAccountId } from "~/utils";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<
    Maybe<AccountInfoResponse["result"]["account_data"]>
  >(Maybe.None());
  const [nfts, setNFTs] = useState<
    AccountNFTsResponse["result"]["account_nfts"]
  >([]);

  const { client } = useXrpLedgerClient();
  const { wallet, wallets } = useXrpLedgerWallet();
  const [txHistory, setTxHistory] = useState<
    Maybe<AccountTxResponse["result"]>
  >(Maybe.None());

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
        defer.then((res) => {
          setAccount(Maybe.Some(res.result.account_data));
        });
      });
  }, [client, wallet]);

  const syncAccountNFTs = useCallback(() => {
    wallet
      .map(
        (w) => (c: Client) =>
          c.request({
            command: "account_nfts",
            account: w.address,
            ledger_index: "validated",
          })
      )
      .apTo(client)
      .forEach((defer) => {
        defer.then((res) => {
          setNFTs(res.result.account_nfts);
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
            limit: 10,
          })
      )
      .apTo(client)
      .forEach((defer) => {
        defer.then((res) => {
          setTxHistory(Maybe.Some(res.result));
        });
      });
  }, [client, wallet]);

  const loadMoreTxHistory = () => {
    if (loading) {
      return;
    }

    wallet
      .map(
        (w) => (c: Client) => (previousPage: AccountTxResponse["result"]) => {
          setLoading(true);
          return c
            .request({
              command: "account_tx",
              account: w.address,
              limit: 20,
              marker: previousPage.marker,
            })
            .then((res) => {
              return {
                ...res,
                result: {
                  ...res.result,
                  transactions: [
                    ...previousPage.transactions,
                    ...res.result.transactions,
                  ],
                },
              };
            })
            .finally(() => {
              setLoading(false);
            });
        }
      )
      .apTo(client)
      .apTo(txHistory)
      .forEach((defer) => {
        defer.then((res) => {
          setTxHistory(Maybe.Some(res.result));
        });
      });
  };

  // init logic when comp is mounted
  useEffect(() => {
    syncAccountInfo();
    syncAccountNFTs();
    syncAccountTxHistory();
  }, [syncAccountInfo, syncAccountNFTs, syncAccountTxHistory]);

  // real-time subscription
  useEffect(() => {
    if (wallets.length <= 0) return;

    const handler = async () => {
      syncAccountInfo();
      syncAccountTxHistory();
      syncAccountNFTs();
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
  }, [client, wallets, syncAccountInfo, syncAccountTxHistory, syncAccountNFTs]);

  return wallet.isSome() ? (
    <>
      <Descriptions
        title={
          <Typography.Title level={3} className="text-center">
            User Profile
          </Typography.Title>
        }
        layout="vertical"
        column={6}
      >
        <Descriptions.Item label="Account ID" span={2}>
          <Typography.Text copyable>
            {wallet.map((w) => parseAccountId(w)).orSome("-")}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Address" span={2}>
          <Typography.Text copyable>
            {wallet.map((w) => w.address).orSome("-")}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Balance">
          {account.map((a) => dropsToXrp(a.Balance)).orSome("-")}
          <span className="ml-1">XRP</span>
        </Descriptions.Item>
        <Descriptions.Item label="NFTs">
          {nfts.length}
          <span className="ml-1">Unit</span>
        </Descriptions.Item>
      </Descriptions>
      <Divider />
      <div className="flex flex-col items-center">
        <Typography.Title level={3}>TX History</Typography.Title>
        <div id="scrollableDiv" className="w-full max-h-500px overflow-y-auto">
          <InfiniteScroll
            dataLength={txHistory.map((h) => h.transactions.length).orSome(0)}
            next={loadMoreTxHistory}
            hasMore={txHistory.every((h) => Boolean(h.marker))}
            loader={
              <Skeleton className="mt-6" paragraph={{ rows: 1 }} active />
            }
            endMessage={<Divider plain>It is all, nothing more 🤐</Divider>}
            scrollableTarget="scrollableDiv"
          >
            {txHistory
              .map((h) => h.transactions.map((t) => t.tx))
              .orSome([])
              .map((tx) => {
                const isRecipient = wallet.every(
                  (w) => w.address === (tx as Payment).Destination
                );

                return (
                  <div
                    className="px-4 py-2 border-b-1 border-b-#d6d9dc border-b-solid mb-1"
                    key={tx?.hash}
                  >
                    <div className="flex mb-2">
                      <span className="mr-2">Sequence</span>
                      <span className="flex-auto"></span>
                      <Typography.Text className="text-xs">
                        {tx?.Sequence === 0
                          ? `${tx.TicketSequence} (Ticket)`
                          : tx?.Sequence}
                      </Typography.Text>
                    </div>
                    <div className="flex">
                      <span className="mr-2">Tx Hash</span>
                      <span className="flex-auto"></span>
                      <ScannerText
                        className="text-xs"
                        href={`/transactions/${tx?.hash}`}
                      >
                        {tx?.hash}
                      </ScannerText>
                    </div>
                    <div className="flex mt-1">
                      <span className="mr-2">{tx?.TransactionType}</span>
                      <span className="flex-auto"></span>
                      {tx?.TransactionType === "Payment" && (
                        <Typography.Text>
                          {dropsToXrp(tx.Amount.toString())} XRP (
                          {isRecipient ? "Received" : "Sent"})
                        </Typography.Text>
                      )}
                      {tx?.TransactionType === "NFTokenMint" && (
                        <ScannerText
                          className="text-xs"
                          type="ipfs"
                          href={`/${convertHexToString(tx.URI ?? "")}`}
                        >
                          {convertHexToString(tx.URI ?? "-")}
                        </ScannerText>
                      )}
                      {tx?.TransactionType === "TicketCreate" && (
                        <Typography.Text>
                          Created {tx.TicketCount} Tickets from Sequence{" "}
                          {tx.Sequence}
                        </Typography.Text>
                      )}
                    </div>
                  </div>
                );
              })}
          </InfiniteScroll>
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
