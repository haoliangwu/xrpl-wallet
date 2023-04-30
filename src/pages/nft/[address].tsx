import {
  Button,
  Card,
  Col,
  Form,
  FormInstance,
  InputNumber,
  Modal,
  Row,
  Spin,
  Typography,
  message,
} from "antd";
import { SettingOutlined, ShareAltOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccountNFTsResponse,
  AccountOffersResponse,
  Client,
  NFTBuyOffersResponse,
  NFTSellOffersResponse,
  NFTokenCreateOfferFlags,
  TxResponse,
} from "xrpl";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { ArrayElement } from "~/types";
import { hexDecode } from "~/utils";

export default function NFT() {
  const router = useRouter();
  const { address } = router.query;
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();
  const { web3Storage } = useWeb3Storage();

  const [nfts, setNFTs] = useState<
    Array<
      ArrayElement<AccountNFTsResponse["result"]["account_nfts"]> & {
        sellOffers: NFTSellOffersResponse["result"]["offers"];
        buyOffers: NFTBuyOffersResponse["result"]["offers"];
      }
    >
  >([]);
  const [nft, setNFT] = useState<
    ArrayElement<AccountNFTsResponse["result"]["account_nfts"]> & {
      sellOffers: NFTSellOffersResponse["result"]["offers"];
      buyOffers: NFTBuyOffersResponse["result"]["offers"];
    }
  >();

  const syncAccountNFTs = useCallback(() => {
    wallet
      .map(
        (w) => (c: Client) =>
          c
            .request({
              command: "account_nfts",
              account: address as string,
            })
            .then((res) => {
              return Promise.all(
                res.result.account_nfts.map((nft) => {
                  return Promise.all([
                    c
                      .request({
                        command: "nft_sell_offers",
                        nft_id: nft.NFTokenID,
                      })
                      .catch(() => {
                        return {
                          result: {
                            offers: [],
                          },
                        };
                      }),
                    c
                      .request({
                        command: "nft_buy_offers",
                        nft_id: nft.NFTokenID,
                      })
                      .catch(() => ({
                        result: {
                          offers: [],
                        },
                      })),
                    ,
                  ]).then(([sellOffers, buyOffers]) => {
                    return {
                      ...nft,
                      sellOffers: sellOffers.result.offers,
                      buyOffers: buyOffers.result.offers,
                    };
                  });
                })
              );
            })
      )
      .apTo(client)
      .forEach((defer) => {
        defer.then((res) => {
          setNFTs(res);
        });
      });
  }, [client, wallet, address]);

  // init logic when comp is mounted
  useEffect(() => {
    syncAccountNFTs();
  }, [syncAccountNFTs]);

  const isSelf = wallet.every((w) => w.address === address);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<FormInstance>(null);

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
            <Col className="mb-4" key={nft.NFTokenID} span={8}>
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
                      onClick={() => {
                        router.push(`${router.asPath}/${nft.NFTokenID}`);
                      }}
                    >
                      SELL
                    </Button>
                  ) : (
                    <Button
                      type="link"
                      key="buy"
                      onClick={() => {
                        setNFT(nft);
                        setIsModalOpen(true);
                      }}
                    >
                      BUY
                    </Button>
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
      <Modal
        key={nft?.NFTokenID}
        title="Create BUY Offer"
        open={isModalOpen}
        onOk={() => {
          if (!nft) return;

          setIsModalOpen(false);
          setLoading(true);

          wallet
            .map((w) => (c: Client) => {
              return c
                .autofill({
                  Owner: address as string,
                  Account: w.address,
                  TransactionType: "NFTokenCreateOffer",
                  NFTokenID: nft.NFTokenID,
                  // todo: custom Amount
                  Amount: `${formRef.current?.getFieldValue("qty")}`,
                })
                .then((prepared) => {
                  return c.submitAndWait(w.sign(prepared).tx_blob);
                });
            })
            .apTo(client)
            .forEach((defer) => {
              defer
                .then((res: TxResponse) => {
                  message.success(`TX ${res.id} Confirmed`);
                })
                .finally(() => {
                  setLoading(false);
                });
            });
        }}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form
          ref={formRef}
          disabled={loading}
          name="basic"
          labelAlign="left"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
        >
          <Form.Item
            label="Quantity"
            name="qty"
            rules={[
              { required: true, message: "Please input the xrp quantity!" },
            ]}
          >
            <InputNumber placeholder="100" addonAfter="XRP" step={10} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
