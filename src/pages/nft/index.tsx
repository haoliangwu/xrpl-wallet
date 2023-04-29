import { Button, Card, Col, Row, Typography, message } from "antd";
import { EditOutlined, LinkOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Web3Storage } from "web3.storage";
import { AccountNFTsResponse, Client } from "xrpl";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { hexDecode } from "~/utils";

export default function NFT() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();
  const { web3Storage } = useWeb3Storage();

  const [nfts, setNFTs] = useState<
    AccountNFTsResponse["result"]["account_nfts"]
  >([]);

  const syncAccountObjects = useCallback(() => {
    wallet
      .map(
        (w) => (c: Client) =>
          c.request({
            command: "account_nfts",
            account: w.address,
          })
      )
      .apTo(client)
      .forEach((defer) => {
        defer.then((res) => {
          setNFTs(res.result.account_nfts);
        });
      });
  }, [client, wallet]);

  // init logic when comp is mounted
  useEffect(() => {
    syncAccountObjects();
  }, [syncAccountObjects]);

  return (
    <div>
      <Row>
        <Col offset={8} span={8}>
          <Typography.Title className="text-center" level={2}>
            My NFTs
          </Typography.Title>
        </Col>
        <Col span={8} className="text-right">
          <Button type="primary" onClick={() => router.push("/nft/create")}>
            Mint
          </Button>
        </Col>
      </Row>
      <Row gutter={16}>
        {nfts.map((nft) => {
          const normalizedUri = nft.URI
            ? `https://ipfs.io/ipfs/${hexDecode(nft.URI)}`
            : "";

          return (
            <Col key={nft.NFTokenID} span={8}>
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
                  <EditOutlined key="edit" />,
                  <LinkOutlined
                    key="link"
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
    </div>
  );
}
