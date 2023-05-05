import {
  Button,
  Form,
  Input,
  InputNumber,
  Spin,
  Typography,
  Upload,
  UploadFile,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import { useState } from "react";
import { Client, NFTokenMintFlags, TxResponse, convertStringToHex } from "xrpl";
import { Web3Storage } from "web3.storage";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { generateNFTokenTaxon } from "~/utils";
import { REPLACED_BY_TICKET_SEQUENCE } from "~/consts";

const onFinishFailed = (errorInfo: any) => {
  console.error("Failed:", errorInfo);
};

const normFile = (e: any) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

export interface NFTokenForm {
  name: string;
  attachment: UploadFile[];
  collection?: string;
  qty: number;
}

export default function CreateNFT() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();
  const { web3Storage } = useWeb3Storage();

  return (
    <div>
      {loading && (
        <div className="fixed top-0 left-0 w-100vw h-100vh z-10 bg-[rgba(123,123,123,0.5)] flex items-center justify-center">
          <Spin />
        </div>
      )}
      <Typography.Title className="text-center" level={2}>
        Mint NFT
      </Typography.Title>
      <Form
        initialValues={{ qty: 1 }}
        disabled={loading}
        className="w-60% mx-auto"
        name="basic"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={async (values) => {
          setLoading(true);

          wallet
            .map((w) => (c: Client) => (web3Storage: Web3Storage) => {
              function mint(nft: NFTokenForm & { seq?: number }) {
                return web3Storage
                  .put(
                    nft.attachment.map((a: any) => a.originFileObj),
                    { name: nft.name }
                  )
                  .then((cid) => {
                    return c
                      .autofill({
                        ...(nft.seq
                          ? {
                              Sequence: REPLACED_BY_TICKET_SEQUENCE,
                              TicketSequence: nft.seq,
                            }
                          : {}),
                        TransactionType: "NFTokenMint",
                        NFTokenTaxon: generateNFTokenTaxon(),
                        Account: w.address,
                        // todo: need to bind NFTokenMinter to AccountRoot
                        // Issuer: w.address,
                        Flags: NFTokenMintFlags.tfTransferable,
                        URI: convertStringToHex(
                          encodeURI(
                            `${cid.toString()}/${nft.attachment[0].name}`
                          )
                        ),
                        Memos: [
                          {
                            Memo: {
                              MemoType: convertStringToHex(
                                encodeURI("nftName")
                              ),
                              MemoData: convertStringToHex(encodeURI(nft.name)),
                            },
                          },
                          {
                            Memo: {
                              MemoType: convertStringToHex(
                                encodeURI("mimetype")
                              ),
                              MemoData: convertStringToHex(
                                encodeURI(nft.attachment[0].type ?? "")
                              ),
                            },
                          },
                        ],
                      })
                      .then((prepared) => {
                        return c.submitAndWait(w.sign(prepared).tx_blob);
                      });
                  });
              }

              if (values.qty > 1) {
                return c
                  .autofill({
                    TransactionType: "TicketCreate",
                    Account: w.address,
                    TicketCount: values.qty,
                  })
                  .then((prepared) => {
                    return c.submitAndWait(w.sign(prepared).tx_blob);
                  })
                  .then((res) =>
                    Promise.all(
                      Array.from<void, Promise<TxResponse>>(
                        new Array(values.qty),
                        (_, idx) =>
                          mint({
                            ...values,
                            seq: res.result.Sequence! + idx + 1,
                          })
                      )
                    )
                  );
              } else {
                return mint(values);
              }
            })
            .apTo(client)
            .apTo(web3Storage)
            .forEach((defer) => {
              defer
                .then((res: TxResponse | TxResponse[]) => {
                  if (Array.isArray(res)) {
                    message.success(
                      `Multiple Mint ${res.length} NFTs TX Confirmed`
                    );
                  } else {
                    message.success(`TX ${res.id} Confirmed`);
                  }

                  router.push(
                    `/nft/${wallet.map((w) => w.getXAddress()).orSome("")}`
                  );
                })
                .finally(() => {
                  setLoading(false);
                });
            });
        }}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please input the NFT name!" }]}
        >
          <Input placeholder="NFT Name" />
        </Form.Item>
        {/* <Form.Item label="Collection" name="collection">
          <Input placeholder="NFT Collection" />
        </Form.Item> */}
        <Form.Item
          label="Attachment"
          name="attachment"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: "Please upload the attachment!" }]}
        >
          <Upload maxCount={1} beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>
        <Form.Item label="Quantity" name="qty">
          <InputNumber min={1} max={100} />
        </Form.Item>
        <Form.Item className="text-right" wrapperCol={{ offset: 18, span: 6 }}>
          <Button loading={loading} type="primary" htmlType="submit">
            Mint
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
