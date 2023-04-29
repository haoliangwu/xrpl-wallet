import {
  Button,
  Form,
  Input,
  InputNumber,
  Typography,
  Upload,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import {
  Client,
  NFTokenMintFlags,
  Payment,
  TxResponse,
  dropsToXrp,
  xrpToDrops,
} from "xrpl";
import { Web3Storage } from "web3.storage";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { hexEncode, generateNFTokenTaxon } from "~/utils";

const onFinishFailed = (errorInfo: any) => {
  console.error("Failed:", errorInfo);
};

const normFile = (e: any) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

export default function CreateNFT() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();
  const { web3Storage } = useWeb3Storage();

  return (
    <div>
      <Typography.Title className="text-center" level={2}>
        Mint NTF
      </Typography.Title>
      <Form
        disabled={loading}
        className="w-60% mx-auto"
        name="basic"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={async (values) => {
          setLoading(true);

          wallet
            .map((w) => (c: Client) => (web3Storage: Web3Storage) => {
              const attachment = values.attachment;
              const taxon = generateNFTokenTaxon();

              return web3Storage
                .put(
                  attachment.map((a: any) => a.originFileObj),
                  { name: values.name }
                )
                .then((cid) => {
                  return c
                    .autofill({
                      TransactionType: "NFTokenMint",
                      NFTokenTaxon: taxon,
                      Account: w.address,
                      // todo: need to bind NFTokenMinter to AccountRoot
                      // Issuer: w.address,
                      Flags: NFTokenMintFlags.tfTransferable,
                      URI: hexEncode(`${cid.toString()}/${attachment[0].name}`),
                      Memos: [
                        {
                          Memo: {
                            MemoType: hexEncode(encodeURI("nftName")),
                            MemoData: hexEncode(encodeURI(values.name)),
                          },
                        },
                        {
                          Memo: {
                            MemoType: hexEncode(encodeURI("mimetype")),
                            MemoData: hexEncode(encodeURI(attachment.type)),
                          },
                        },
                      ],
                    })
                    .then((prepared) => {
                      return c.submitAndWait(w.sign(prepared).tx_blob);
                    });
                });
            })
            .apTo(client)
            .apTo(web3Storage)
            .forEach((defer) => {
              defer
                .then((res: TxResponse) => {
                  message.success(`TX ${res.id} Confirmed`);

                  router.push("/nft");
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
        <Form.Item className="text-right" wrapperCol={{ offset: 18, span: 6 }}>
          <Button loading={loading} type="primary" htmlType="submit">
            Mint
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
