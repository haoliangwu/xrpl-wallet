import { Button, Card, Col, Row, Spin, Typography, message } from "antd";
import {
  SettingOutlined,
  ShareAltOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Client, TxResponse } from "xrpl";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { NFTokenPage, NFToken } from "~/types";
import { hexDecode } from "~/utils";

export default function NFT() {
  const router = useRouter();
  const { address } = router.query;
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();
  const { web3Storage } = useWeb3Storage();

  const [nftPage, setNftPage] = useState<NFTokenPage>();
  const [nfts, setNFTs] = useState<Array<NFToken>>([]);

  const isSelf = wallet.every((w) => w.address === address);

  const syncAccountNFTs = useCallback(
    (nftPageId: string) => {
      if (isSelf) {
        wallet
          .map(
            (w) => (c: Client) =>
              c
                .request({
                  command: "ledger_entry",
                  nft_page: nftPageId,
                  ledger_index: "validated",
                })
                .then((res) => {
                  // @ts-ignore
                  return res.result.node as NFTokenPage;
                })
          )
          .apTo(client)
          .forEach((defer) => {
            defer.then((res) => {
              setNftPage(res);
              setNFTs(res.NFTokens.map((t) => t.NFToken));
            });
          });
      } else {
        wallet
          .map(
            (w) => (c: Client) =>
              c.request({
                command: "account_nfts",
                account: address as string,
                ledger_index: "validated",
              })
          )
          .apTo(client)
          .forEach((defer) => {
            defer.then((res) => {
              setNFTs(res.result.account_nfts);
            });
          });
      }
    },
    [client, wallet, isSelf]
  );

  // init logic when comp is mounted
  useEffect(() => {
    wallet
      .map(
        (w) => (c: Client) =>
          fetch(`/api/account-id?pubKey=${w.publicKey}`)
            .then((res) => res.json())
            .then(({ account_id }) => {
              return syncAccountNFTs(`${account_id}FFFFFFFFFFFFFFFFFFFFFFFF`);
            })
      )
      .apTo(client);
  }, [client, syncAccountNFTs, wallet]);

  return (
    <div>
      {loading && (
        <div className="fixed top-0 left-0 w-100vw h-100vh z-10 bg-[rgba(123,123,123,0.5)] flex items-center justify-center">
          <Spin />
        </div>
      )}
      <Row>
        <Col span={16}>
          <Typography.Title level={3}>
            NFTs <Typography.Text>/ {address}</Typography.Text>
          </Typography.Title>
        </Col>
        {isSelf && (
          <Col span={8} className="text-right">
            <Button type="primary" onClick={() => router.push("/nft/create")}>
              Mint
            </Button>
          </Col>
        )}
      </Row>
      <Row gutter={16}>
        {nfts.map((nft) => {
          const normalizedUri = nft.URI
            ? `https://ipfs.io/ipfs/${hexDecode(nft.URI)}`
            : "";

          return (
            <Col className="mb-4" key={nft.NFTokenID} span={6}>
              <Card
                cover={
                  nft.URI ? (
                    // eslint-disable-next-line
                    <img
                      width={300}
                      height={200}
                      className="object-cover"
                      alt="nft cover"
                      src={normalizedUri}
                    />
                  ) : null
                }
                actions={[
                  isSelf ? (
                    <Button
                      type="link"
                      key="sell"
                      icon={<SettingOutlined />}
                      onClick={() => {
                        router.push(`${router.asPath}/${nft.NFTokenID}`);
                      }}
                    />
                  ) : (
                    <Button
                      type="link"
                      key="buy"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        router.push(`${router.asPath}/${nft.NFTokenID}`);
                      }}
                    />
                  ),
                  <Button
                    type="link"
                    key="link"
                    icon={<ShareAltOutlined />}
                    onClick={() => {
                      message.success("Copied!");
                      navigator.clipboard.writeText(normalizedUri);
                    }}
                  />,
                ]}
              >
                <Card.Meta description={nft.NFTokenID} />
              </Card>
            </Col>
          );
        })}
      </Row>
      <Row hidden={!isSelf} gutter={16}>
        <Col span={8} offset={8} className="text-center">
          <Button
            onClick={() => syncAccountNFTs(nftPage?.NextPageMin!)}
            disabled={!nftPage?.NextPageMin}
            className="mr-4"
          >
            Prev
          </Button>
          <Button
            onClick={() => syncAccountNFTs(nftPage?.PreviousPageMin!)}
            disabled={!nftPage?.PreviousPageMin}
          >
            Next
          </Button>
        </Col>
      </Row>
    </div>
  );
}
