import { useEffect, useState } from "react";
import { Select, Avatar, Typography, Divider } from "antd";
import { UserOutlined } from "@ant-design/icons";
import Image from "next/image";
import { Client, Wallet, AccountInfoResponse } from "xrpl";
import { useRouter } from "next/router";

import { dropsToXRP } from "~/utils";
import useXrpLedgerClient from "~/hooks/useXrpLedgerClient";

export default function Home() {
  const router = useRouter();
  const [seed] = useState<string>(
    () => localStorage.getItem("__wallet_seed__") ?? ""
  );
  const [wallet, setWallet] = useState<Wallet>();
  const [account, setAccount] =
    useState<AccountInfoResponse["result"]["account_data"]>();

  const { client, network, setNetwork } = useXrpLedgerClient();

  useEffect(() => {
    if (!seed) router.push("/create");

    const test_wallet = Wallet.fromSeed(seed);

    setWallet(test_wallet);

    client
      .request({
        command: "account_info",
        account: test_wallet.address,
        ledger_index: "validated",
      })
      .then(({ result }) => {
        setAccount(result.account_data);
      });
  }, [client, seed, router]);

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
            {account?.Balance ? dropsToXRP(account.Balance).toFormat(0) : "-"}
            <span className="ml-1">XRP</span>
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
