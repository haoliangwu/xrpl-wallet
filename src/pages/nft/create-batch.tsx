import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Spin,
  Typography,
  Upload,
  UploadFile,
  message,
} from "antd";
import {
  UploadOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import { useState } from "react";
import { Client, NFTokenMintFlags, convertStringToHex } from "xrpl";
import { Web3Storage } from "web3.storage";

import {
  useWeb3Storage,
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";
import { generateNFTokenTaxon } from "~/utils";
import { REPLACED_BY_TICKET_SEQUENCE } from "~/consts";
import { NFTokenForm } from "./create";

const onFinishFailed = (errorInfo: any) => {
  console.error("Failed:", errorInfo);
};

const normFile = (e: any) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

export default function CreateNFTBatch() {
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
        Batch Mint NFT
      </Typography.Title>
      <Form
        disabled={loading}
        className="w-60% mx-auto"
        name="batch"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={async (values) => {
          const nfts = values.nfts as Array<
            Pick<NFTokenForm, "name" | "attachment" | "fee" | "flags">
          >;

          setLoading(true);

          wallet
            .map((w) => (c: Client) => (web3Storage: Web3Storage) => {
              return c
                .autofill({
                  TransactionType: "TicketCreate",
                  Account: w.address,
                  TicketCount: nfts.length,
                })
                .then((prepared) => {
                  return c.submitAndWait(w.sign(prepared).tx_blob);
                })
                .then((res) =>
                  nfts.map((nft, idx) => ({
                    ...nft,
                    seq: res.result.Sequence! + idx + 1,
                  }))
                )
                .then((nfts) => {
                  return Promise.all(
                    nfts.map(({ name, attachment, seq, fee, flags }) => {
                      const taxon = generateNFTokenTaxon();

                      return web3Storage
                        .put(
                          attachment.map((a: any) => a.originFileObj),
                          { name }
                        )
                        .then((cid) => {
                          return c
                            .autofill({
                              Sequence: REPLACED_BY_TICKET_SEQUENCE,
                              TicketSequence: seq,
                              TransactionType: "NFTokenMint",
                              NFTokenTaxon: taxon,
                              Account: w.address,
                              // todo: need to bind NFTokenMinter to AccountRoot
                              // Issuer: w.address,
                              TransferFee: (fee ?? 0) * 1000,
                              Flags: (flags ?? []).reduce((a, b) => a | b, 0),
                              URI: convertStringToHex(
                                encodeURI(
                                  `${cid.toString()}/${attachment[0].name}`
                                )
                              ),
                              Memos: [
                                {
                                  Memo: {
                                    MemoType: convertStringToHex(
                                      encodeURI("nftName")
                                    ),
                                    MemoData: convertStringToHex(
                                      encodeURI(name)
                                    ),
                                  },
                                },
                                {
                                  Memo: {
                                    MemoType: convertStringToHex(
                                      encodeURI("mimetype")
                                    ),
                                    MemoData: convertStringToHex(
                                      encodeURI(attachment[0].type ?? "unknown")
                                    ),
                                  },
                                },
                              ],
                            })
                            .then((prepared) => {
                              return c.submitAndWait(w.sign(prepared).tx_blob);
                            });
                        });
                    })
                  );
                });
            })
            .apTo(client)
            .apTo(web3Storage)
            .forEach((defer) => {
              defer
                .then((res) => {
                  message.success(`Batch Mint ${res.length} NFTs TX Confirmed`);

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
        <Form.List
          name="nfts"
          rules={[
            {
              validator: async (_, names) => {
                if (!names || names.length < 1) {
                  return Promise.reject(new Error("At least 1 NFToken"));
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Form.Item wrapperCol={{ span: 24 }} required={false} key={key}>
                  <Form.Item
                    {...restField}
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    name={[name, "name"]}
                    label="Name"
                    rules={[
                      { required: true, message: "Please input the NFT name!" },
                    ]}
                  >
                    <Input placeholder="NFT Name" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    name={[name, "attachment"]}
                    label="Attachment"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                    rules={[
                      {
                        required: true,
                        message: "Please upload the attachment!",
                      },
                    ]}
                  >
                    <Upload maxCount={1} beforeUpload={() => false}>
                      <Button icon={<UploadOutlined />}>Select File</Button>
                    </Upload>
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    label="Transfer Fee"
                    name={[name, "fee"]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step="0.1"
                      precision={3}
                      placeholder="0.000"
                      addonAfter="%"
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    name={[name, "flags"]}
                    label="Flags"
                  >
                    <Checkbox.Group>
                      <Row>
                        <Col span={8}>
                          <Checkbox value={NFTokenMintFlags.tfBurnable}>
                            Burnable
                          </Checkbox>
                        </Col>
                        <Col span={8}>
                          <Checkbox value={NFTokenMintFlags.tfOnlyXRP}>
                            OnlyXRP
                          </Checkbox>
                        </Col>
                        <Col span={8}>
                          <Checkbox value={NFTokenMintFlags.tfTransferable}>
                            Transferable
                          </Checkbox>
                        </Col>
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                  <Form.Item className="text-right">
                    {fields.length > 1 ? (
                      <MinusCircleOutlined
                        disabled={loading}
                        className="dynamic-delete-button"
                        onClick={() => !loading && remove(name)}
                      />
                    ) : null}
                  </Form.Item>
                </Form.Item>
              ))}
              <Form.Item className="text-right">
                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      flags: [NFTokenMintFlags.tfTransferable],
                    })
                  }
                  className="mr-2"
                  icon={<PlusOutlined />}
                >
                  Add NFToken
                </Button>
                <Button loading={loading} type="primary" htmlType="submit">
                  Mint
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </div>
  );
}
