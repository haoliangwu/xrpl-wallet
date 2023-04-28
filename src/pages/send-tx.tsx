import { Button, Form, Input, InputNumber, message } from "antd";
import { useRouter } from "next/router";
import { useState } from "react";
import { Client, Payment, TxResponse, dropsToXrp, xrpToDrops } from "xrpl";
import {
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";

const onFinishFailed = (errorInfo: any) => {
  console.error("Failed:", errorInfo);
};

export default function SendTx() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();

  return (
    <div className="relative w-100vw h-100vh">
      <div className="absolute top-50% left-50% transform translate-x-[-50%] translate-y-[-50%]">
        <Form
          disabled={loading}
          className="w-500px"
          name="basic"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onFinish={async (values) => {
            setLoading(true);

            wallet
              .map(
                (w) => (c: Client) =>
                  c
                    .autofill({
                      TransactionType: "Payment",
                      Account: w.address,
                      Amount: xrpToDrops(values.qty),
                      Destination: values.address,
                    })
                    .then((prepared: Payment) => {
                      const max_ledger = prepared.LastLedgerSequence;
                      console.log(
                        "Prepared transaction instructions:",
                        prepared
                      );
                      console.log(
                        "Transaction cost:",
                        dropsToXrp(prepared.Fee!),
                        "XRP"
                      );
                      console.log(
                        "Transaction expires after ledger:",
                        max_ledger
                      );

                      return c.submitAndWait(w.sign(prepared).tx_blob);
                    })
              )
              .apTo(client)
              .forEach((defer) => {
                defer
                  .then((res: TxResponse) => {
                    message.success(`TX ${res.id} Confirmed`);

                    router.push("/");
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
            label="Target Address"
            name="address"
            rules={[
              { required: true, message: "Please input the target address!" },
            ]}
          >
            <Input placeholder="rEJfLEEDvrdGwK8gszQa9bL2TYd8Cek5Fp" />
          </Form.Item>

          <Form.Item
            label="Quantity"
            name="qty"
            rules={[
              { required: true, message: "Please input the xrp quantity!" },
            ]}
          >
            <InputNumber placeholder="100" step={10} min={0} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button loading={loading} type="primary" htmlType="submit">
              Send
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
