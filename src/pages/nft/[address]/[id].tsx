import {
  Button,
  Card,
  Col,
  Row,
  Spin,
  Typography,
  message,
  List,
  Checkbox,
  Divider,
  Popconfirm,
  FormInstance,
  Modal,
  Form,
  InputNumber,
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
  dropsToXrp,
  xrpToDrops,
} from "xrpl";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { ArrayElement } from "~/types";
import { hexDecode, resolveTxExpiration } from "~/utils";
import ScannerText from "~/components/ScannerText";

export default function NFTDetail() {
  const router = useRouter();
  const { address, id } = router.query;
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();
  const { web3Storage } = useWeb3Storage();

  const [sellOffer, setSellOffer] =
    useState<ArrayElement<NFTSellOffersResponse["result"]["offers"]>>();
  const [buyOffer, setBuyOffer] =
    useState<ArrayElement<NFTSellOffersResponse["result"]["offers"]>>();

  const [nft, setNFT] = useState<
    ArrayElement<AccountNFTsResponse["result"]["account_nfts"]> & {
      sellOffers: NFTSellOffersResponse["result"]["offers"];
      buyOffers: NFTBuyOffersResponse["result"]["offers"];
    }
  >();

  const isSelf = wallet.every((w) => w.address === address);

  const syncAccountNFTs = useCallback(() => {
    wallet
      .map(
        (w) => (c: Client) =>
          c
            .request({
              command: "account_nfts",
              account: address as string,
            })
            .then((res) =>
              res.result.account_nfts.find((ntf) => ntf.NFTokenID === id)
            )
            .then((nft) => {
              if (!nft) return Promise.reject("not found ntf object");

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
      )
      .apTo(client)
      .forEach((defer) => {
        defer.then((res) => {
          setNFT(res);
        });
      });
  }, [wallet, client, address, id]);

  // init logic when comp is mounted
  useEffect(() => {
    syncAccountNFTs();
  }, [syncAccountNFTs]);

  const [isModalOpenSell, setIsModalOpenSell] = useState(false);
  const formRefSell = useRef<FormInstance>(null);
  const [isModalOpenBuy, setIsModalOpenBuy] = useState(false);
  const formRefBuy = useRef<FormInstance>(null);

  const normalizedUri = nft?.URI
    ? `https://ipfs.io/ipfs/${hexDecode(nft.URI)}`
    : "";

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
            NFT{" "}
            <Typography.Text>
              / <ScannerText href={`/nft/${id}`}>{id}</ScannerText>
            </Typography.Text>
          </Typography.Title>
        </Col>
      </Row>
      <Row>
        {isSelf ? (
          <Col span={24} className="text-right">
            <Popconfirm
              title="Are you sure ?"
              onConfirm={() => {
                setLoading(true);

                wallet
                  .map((w) => (c: Client) => {
                    return c
                      .autofill({
                        Account: w.address,
                        TransactionType: "NFTokenBurn",
                        NFTokenID: id as string,
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

                        router.push(
                          `/nft/${wallet.map((w) => w.address).orSome("")}`
                        );
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                  });
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button danger type="primary" className="ml-2">
                Burn
              </Button>
            </Popconfirm>
            {nft?.sellOffers && nft?.sellOffers.length > 0 ? (
              <>
                <Popconfirm
                  title="Are you sure ?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => {
                    setLoading(true);

                    wallet
                      .map((w) => (c: Client) => {
                        return Promise.all([
                          c
                            .autofill(
                              isSelf
                                ? {
                                    Account: w.address,
                                    TransactionType: "NFTokenAcceptOffer",
                                    NFTokenBuyOffer: buyOffer?.nft_offer_index,
                                  }
                                : {
                                    Account: w.address,
                                    TransactionType: "NFTokenAcceptOffer",
                                    NFTokenSellOffer:
                                      sellOffer?.nft_offer_index,
                                  }
                            )
                            .then((prepared) => {
                              return c.submitAndWait(w.sign(prepared).tx_blob);
                            }),
                          c
                            .autofill({
                              Account: w.address,
                              TransactionType: "NFTokenCancelOffer",
                              NFTokenOffers: nft.sellOffers.map(
                                (o) => o.nft_offer_index
                              ),
                            })
                            .then((prepared) => {
                              return c.submit(w.sign(prepared).tx_blob);
                            }),
                        ]);
                      })
                      .apTo(client)
                      .forEach((defer) => {
                        defer
                          .then(([res]) => {
                            message.success(`TX ${res.id} Confirmed`);

                            router.push(
                              `/nft/${wallet.map((w) => w.address).orSome("")}`
                            );
                          })
                          .finally(() => {
                            setLoading(false);
                          });
                      });
                  }}
                >
                  <Button className="ml-2" disabled={!buyOffer} type="primary">
                    Accept
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Are you sure ?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => {
                    setLoading(true);

                    wallet
                      .map((w) => (c: Client) => {
                        return c
                          .autofill({
                            Account: w.address,
                            TransactionType: "NFTokenCancelOffer",
                            NFTokenOffers: nft.sellOffers.map(
                              (o) => o.nft_offer_index
                            ),
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

                            syncAccountNFTs();
                          })
                          .finally(() => {
                            setLoading(false);
                          });
                      });
                  }}
                >
                  <Button className="ml-2">Cancel</Button>
                </Popconfirm>
              </>
            ) : (
              <Button
                className="ml-2"
                type="primary"
                onClick={() => setIsModalOpenSell(true)}
              >
                SELL
              </Button>
            )}
          </Col>
        ) : (
          <Col span={24} className="text-right">
            <Button type="primary" onClick={() => setIsModalOpenBuy(true)}>
              BUY
            </Button>
          </Col>
        )}
      </Row>
      <Row gutter={16} className="mt-4">
        <Col span={8}>
          <img
            className="w-full object-cover"
            alt="nft cover"
            src={normalizedUri}
          />
        </Col>
        <Col span={16}>
          <List
            header={
              <div className="flex">
                <Typography.Title level={3}>SELL Offers</Typography.Title>
                <span className="flex-auto"></span>
              </div>
            }
            bordered
            dataSource={nft?.sellOffers}
            renderItem={(
              item: ArrayElement<NFTSellOffersResponse["result"]["offers"]>
            ) => (
              <List.Item>
                <div className="flex-auto">
                  <div className="flex">
                    <Typography.Text>{item.nft_offer_index}</Typography.Text>
                  </div>
                  <Typography.Text mark>
                    {dropsToXrp(item.amount.toString())}
                  </Typography.Text>
                  <span className="mx-1">XRP /</span>
                  <Typography.Text>{item.owner}</Typography.Text>
                </div>
              </List.Item>
            )}
          />
          <List
            className="mt-4"
            header={
              <div className="flex">
                <Typography.Title level={3}>BUY Offers</Typography.Title>
                <span className="flex-auto"></span>
              </div>
            }
            bordered
            dataSource={nft?.buyOffers}
            renderItem={(
              item: ArrayElement<NFTBuyOffersResponse["result"]["offers"]>
            ) => (
              <List.Item>
                <div className="flex-auto">
                  <div className="flex">
                    <Typography.Text>{item.nft_offer_index}</Typography.Text>
                    <span className="flex-auto" />
                    <Checkbox
                      checked={
                        buyOffer?.nft_offer_index === item.nft_offer_index
                      }
                      onClick={() => setBuyOffer(item)}
                    />
                  </div>
                  <Typography.Text mark>
                    {dropsToXrp(item.amount.toString())}
                  </Typography.Text>
                  <span className="mx-1">XRP /</span>
                  <Typography.Text>{item.owner}</Typography.Text>
                </div>
              </List.Item>
            )}
          />
        </Col>
      </Row>
      <Modal
        key={nft?.NFTokenID + "SELL"}
        title="Create SELL Offer"
        open={isModalOpenSell}
        onOk={() => {
          if (!nft) return;

          setIsModalOpenSell(false);
          setLoading(true);

          wallet
            .map((w) => (c: Client) => {
              return c
                .autofill({
                  Account: w.address,
                  TransactionType: "NFTokenCreateOffer",
                  NFTokenID: nft.NFTokenID,
                  Amount: xrpToDrops(formRefSell.current?.getFieldValue("qty")),
                  Flags: NFTokenCreateOfferFlags.tfSellNFToken,
                  // todo: it is better to be broker
                  Destination: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
                  // todo: it could be customized
                  Expiration: resolveTxExpiration(3600 * 24 * 7),
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

                  syncAccountNFTs();
                })
                .finally(() => {
                  setLoading(false);
                });
            });
        }}
        onCancel={() => setIsModalOpenSell(false)}
      >
        <Form
          ref={formRefSell}
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
      <Modal
        key={nft?.NFTokenID + "BUY"}
        title="Create BUY Offer"
        open={isModalOpenBuy}
        onOk={() => {
          if (!nft) return;

          setIsModalOpenBuy(false);
          setLoading(true);

          wallet
            .map((w) => (c: Client) => {
              return c
                .autofill({
                  Owner: address as string,
                  Account: w.address,
                  TransactionType: "NFTokenCreateOffer",
                  NFTokenID: nft.NFTokenID,
                  Amount: xrpToDrops(formRefBuy.current?.getFieldValue("qty")),
                  // todo: it could be customized
                  Expiration: resolveTxExpiration(3600 * 24 * 7),
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

                  syncAccountNFTs();
                })
                .finally(() => {
                  setLoading(false);
                });
            });
        }}
        onCancel={() => setIsModalOpenBuy(false)}
      >
        <Form
          ref={formRefBuy}
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
