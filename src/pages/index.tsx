import { useEffect, useState } from "react";
import { Select, Avatar, Typography, Divider, Button } from "antd";
import { UserOutlined } from "@ant-design/icons";
import Image from "next/image";
import { Wallet, AccountInfoResponse, dropsToXrp } from "xrpl";
import { useRouter } from "next/router";

import {
  useXrpLedgerClient,
  useXrpLedgerWallet,
} from "~/hooks/useXrpLedgerHook";

export default function Home() {
  const router = useRouter();
  const [account, setAccount] =
    useState<AccountInfoResponse["result"]["account_data"]>();

  const { client, network, setNetwork } = useXrpLedgerClient();
  const { wallet } = useXrpLedgerWallet();

  useEffect(() => {
    if (!wallet) {
      router.push("/create");
      return;
    }

    client
      .request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated",
      })
      .then(({ result }) => {
        setAccount(result.account_data);
      });
  }, [client, router, wallet]);

  return (
    <div className="w-1000px mx-auto">
      <div className="h-80px flex items-center gap-4">
        <Image
          width={200}
          height={40}
          src="https://xrpl.org/assets/img/XRPLedger_DevPortal-black.svg"
          alt="logo"
        />
        <span className="flex-auto" />
        <div>
          <Select
            value={network}
            onChange={(v) => setNetwork(v)}
            options={[
              {
                value: "wss://s.altnet.rippletest.net:51233",
                label: "TestNet",
              },
              {
                value: "wss://s.devnet.rippletest.net:51233/",
                label: "DevNet",
                disabled: true,
              },
            ]}
          />
        </div>
        <div>
          <Avatar size="large" icon={<UserOutlined />} />
        </div>
      </div>
      <div className="bg-#ffffff p-4">
        <div className="h-64px text-center">
          <Typography.Title level={4}>Address</Typography.Title>
          <Typography.Text copyable>{wallet?.address}</Typography.Text>
        </div>
        <Divider />
        <div className="flex flex-col items-center">
          <Typography.Title level={4}>Balance</Typography.Title>
          <div>
            {account?.Balance ? dropsToXrp(account.Balance) : "-"}
            <span className="ml-1">XRP</span>
          </div>
          <div className="flex gap-4 mt-4">
            <Button
              type="primary"
              onClick={() => {
                router.push("/send-tx");
              }}
            >
              Send
            </Button>
          </div>
        </div>
        <Divider />
        <div className="flex flex-col items-center">
          <Typography.Title level={4}>History</Typography.Title>
        </div>
      </div>
    </div>
  );
}
