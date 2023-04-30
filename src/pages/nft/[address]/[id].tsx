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
} from "antd";
import { SettingOutlined, ShareAltOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
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

  const isSelf = wallet.every((w) => w.address === address);
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
            NFT <Typography.Text>/ {id}</Typography.Text>
          </Typography.Title>
        </Col>
      </Row>
      <Row>
        <Col span={8} offset={16} className="text-right">
          <Button
            disabled={(isSelf && !buyOffer) || (!isSelf && !sellOffer)}
            type="primary"
            onClick={() => {
              setLoading(true);

              wallet
                .map((w) => (c: Client) => {
                  return c
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
                            NFTokenSellOffer: sellOffer?.nft_offer_index,
                          }
                    )
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
          >
            Accept
          </Button>
        </Col>
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
          {!isSelf ? (
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
                      <span className="flex-auto" />
                      <Checkbox
                        checked={
                          sellOffer?.nft_offer_index === item.nft_offer_index
                        }
                        onClick={() => setSellOffer(item)}
                      />
                    </div>
                    <Typography.Text mark>
                      {item.amount.toString()}
                    </Typography.Text>
                    <span className="mx-1">XRP /</span>
                    <Typography.Text>{item.owner}</Typography.Text>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <List
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
                      {item.amount.toString()}
                    </Typography.Text>
                    <span className="mx-1">XRP /</span>
                    <Typography.Text>{item.owner}</Typography.Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Col>
      </Row>
    </div>
  );
}
