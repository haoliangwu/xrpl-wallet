import { Button, Result, Typography } from "antd";
import { useRouter } from "next/router";
import { useContext, useState } from "react";
import { Wallet } from "xrpl";

import { LS_KEY } from "~/consts";
import {
  XrpLedgerClientProvider,
  useXrpLedgerClient,
} from "~/hooks/useXrpLedgerHook";

export default function Create() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { client } = useXrpLedgerClient();
  const { setWallet: setContextWallet, setWallets } = useContext(XrpLedgerClientProvider);
  const [wallet, setWallet] = useState<Wallet>();

  return (
    <div className="relative w-100vw h-100vh">
      <div className="absolute top-50% left-50% transform translate-x-[-50%] translate-y-[-50%]">
        {wallet ? (
          <Result
            className="w-700px"
            status="success"
            title="Successfully Create XRP Ledger Account!"
            subTitle={
              <div className="mt-4 text-left">
                <div className="flex">
                  <span className="mr-4">Address:</span>
                  <span className="flex-auto" />
                  <Typography.Text copyable>{wallet.address}</Typography.Text>
                </div>
                <div className="flex">
                  <span className="mr-4">Public Key:</span>
                  <span className="flex-auto" />
                  <Typography.Text copyable>{wallet.publicKey}</Typography.Text>
                </div>
                <div className="flex">
                  <span className="mr-4">Private Key:</span>
                  <span className="flex-auto" />
                  <Typography.Text copyable>
                    {wallet.privateKey}
                  </Typography.Text>
                </div>
                <div className="flex">
                  <span className="mr-4">Seed:</span>
                  <span className="flex-auto" />
                  <Typography.Text copyable>{wallet.seed}</Typography.Text>
                </div>
              </div>
            }
            extra={[
              <Button
                type="primary"
                key="go_dashboard"
                onClick={() => router.replace("/")}
              >
                Go Dashboard
              </Button>,
            ]}
          />
        ) : (
          <Button
            type="primary"
            loading={loading}
            onClick={() => {
              setLoading(true);
              client
                .fundWallet()
                .then((res) => {
                  setWallet(res.wallet);

                  const seeds = JSON.parse(
                    localStorage.getItem(LS_KEY.WALLET_SEEDS) ?? "[]"
                  ) as Array<string>;

                  seeds.push(res.wallet.seed as string);

                  localStorage.setItem(
                    LS_KEY.WALLET_SEEDS,
                    JSON.stringify(seeds)
                  );

                  const wallets = seeds.map((seed) => Wallet.fromSeed(seed));

                  setWallets(wallets);
                  setContextWallet(wallets[0])
                })
                .finally(() => {
                  setLoading(false);
                });
            }}
          >
            Generate XRP Ledger Account
          </Button>
        )}
      </div>
    </div>
  );
}
