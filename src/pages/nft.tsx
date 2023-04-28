import { Button, Form, Input, InputNumber, Typography, message } from "antd";
import { useRouter } from "next/router";
import { useState } from "react";
import { Client, Payment, TxResponse, dropsToXrp, xrpToDrops } from "xrpl";
import {
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";

export default function NFT() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();

  return (
    <div>
      <Typography.Title className="text-center" level={2}>
        NTF
      </Typography.Title>
    </div>
  );
}
