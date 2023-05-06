import {
  Button,
  Col,
  Divider,
  List,
  Row,
  Skeleton,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ShareAltOutlined,
  EyeOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import {
  Client,
  NFTokenMintFlags,
  convertHexToString,
  parseNFTokenID,
  xAddressToClassicAddress,
} from "xrpl";
import InfiniteScroll from "react-infinite-scroll-component";
import useDidMount from "beautiful-react-hooks/useDidMount";
import { Maybe } from "monet";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { NFTokenPage, NFToken } from "~/types";
import ScannerText from "~/components/ScannerText";
import { parseAccountId } from "~/utils";

export default function NFT() {
  const router = useRouter();
  const { address: xAddress } = router.query;
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();
  const { web3Storage } = useWeb3Storage();

  const [nftPage, setNftPage] = useState<Maybe<NFTokenPage>>(Maybe.None());
  const [nfts, setNFTs] = useState<Array<NFToken>>([]);

  const isSelf = wallet.exists((w) => w.getXAddress() === xAddress);

  const syncAccountNFTs = useCallback(
    (nftPageId: string) => {
      wallet
        .map((w) => (c: Client) => {
          setLoading(true);
          return c
            .request({
              command: "ledger_entry",
              nft_page: nftPageId,
              ledger_index: "validated",
            })
            .then((res) => {
              // @ts-ignore
              return res.result.node as NFTokenPage;
            })
            .finally(() => {
              setLoading(false);
            });
        })
        .apTo(client)
        .forEach((defer) => {
          defer
            .then((res) => {
              setNftPage(Maybe.Some(res));
              setNFTs((prev) => [
                ...prev,
                ...res.NFTokens.map((t) => t.NFToken),
              ]);
            })
            .catch((err: Error) => {
              console.error(err);

              setNftPage(Maybe.None());
              setNFTs([]);
            });
        });
    },
    [wallet, client]
  );

  const loadMoreNFTs = () => {
    if (loading) {
      return;
    }

    nftPage
      .filter((p) => Boolean(p.PreviousPageMin))
      .map((p) => p.PreviousPageMin!)
      .forEach((pageIndex) => {
        syncAccountNFTs(pageIndex);
      });
  };

  // init logic when comp is mounted
  useDidMount(() => {
    if(isSelf) {

      wallet.forEach((w) => {
        return syncAccountNFTs(`${parseAccountId(w)}FFFFFFFFFFFFFFFFFFFFFFFF`);
      });
    } else {
      syncAccountNFTs(`${parseAccountId(xAddress as string)}FFFFFFFFFFFFFFFFFFFFFFFF`)
    }
  });

  const { classicAddress } = xAddressToClassicAddress(xAddress as string);

  return (
    <div>
      <Row>
        <Col span={16}>
          <Typography.Title level={3}>
            NFTs
            <Typography.Text className="ml-1">
              /{" "}
              <ScannerText href={`/accounts/${classicAddress}/assets/nft`}>
                {classicAddress}
              </ScannerText>
            </Typography.Text>
          </Typography.Title>
        </Col>
        {isSelf && (
          <Col span={8} className="text-right">
            <Button
              className="mr-2"
              type="primary"
              onClick={() => router.push("/nft/create-batch")}
            >
              Batch Mint
            </Button>
            <Button type="primary" onClick={() => router.push("/nft/create")}>
              Mint
            </Button>
          </Col>
        )}
      </Row>
      <div id="scrollableDiv" className="my-12 w-full h-600px overflow-y-auto">
        <InfiniteScroll
          dataLength={nfts.length}
          next={loadMoreNFTs}
          hasMore={nftPage.exists((p) => Boolean(p.PreviousPageMin))}
          loader={<Skeleton className="mt-6" paragraph={{ rows: 1 }} active />}
          endMessage={
            // warn: the limit of NFTokenPage is 32
            nfts.length > 32 && (
              <Divider plain>It is all, nothing more 🤐</Divider>
            )
          }
          scrollableTarget="scrollableDiv"
          hasChildren={nfts.length > 0}
        >
          <List
            itemLayout="vertical"
            size="large"
            dataSource={nfts}
            renderItem={(nft) => {
              const normalizedUri = nft.URI
                ? `https://ipfs.io/ipfs/${convertHexToString(nft.URI ?? "")}`
                : "";
              const parsedNFToken = parseNFTokenID(nft.NFTokenID);

              return (
                <List.Item
                  key={nft.NFTokenID}
                  actions={[
                    <Button
                      type="link"
                      key="buy"
                      icon={isSelf ? <SettingOutlined /> : <EyeOutlined />}
                      onClick={() => {
                        router.push(`${router.asPath}/${nft.NFTokenID}`);
                      }}
                    />,
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
                  extra={
                    nft.URI ? (
                      // eslint-disable-next-line
                      <img
                        width={100}
                        height={100}
                        className="object-cover"
                        alt="nft cover"
                        src={normalizedUri}
                      />
                    ) : null
                  }
                >
                  <List.Item.Meta
                    title={
                      <ScannerText
                        className="text-xs"
                        href={`/ntf/${nft.NFTokenID}`}
                      >
                        {nft.NFTokenID}
                      </ScannerText>
                    }
                    description={
                      <div className="flex gap-2">
                        {Boolean(
                          NFTokenMintFlags.tfBurnable & parsedNFToken.Flags
                        ) && <Tag>Burnable</Tag>}
                        {Boolean(
                          NFTokenMintFlags.tfOnlyXRP & parsedNFToken.Flags
                        ) && <Tag>OnlyXRP</Tag>}
                        {Boolean(
                          NFTokenMintFlags.tfTransferable & parsedNFToken.Flags
                        ) && <Tag>Transferable</Tag>}
                      </div>
                    }
                  />
                  {/* todo: the nft content */}
                </List.Item>
              );
            }}
          ></List>
        </InfiniteScroll>
      </div>
    </div>
  );
}
