import { PropsWithChildren } from "react";
import cls from "classnames";
import { useXrpLedgerClient } from "~/hooks/useXrpLedgerHook";
import { XrpLogoIcon, IpfsLogoIcon } from "./Icons";

const isTestNet = (s: string) => s.indexOf("altnet.rippletest.net");

const ScannerText: React.FC<
  PropsWithChildren<{
    href: string | (() => Promise<string>);
    className?: string;
    type?: "xrp" | "ipfs";
    bordered?: boolean;
  }>
> = ({ children, href, className, type = "xrp", bordered = true }) => {
  const { network } = useXrpLedgerClient();

  return (
    <div
      className={cls(
        className,
        "flex-inline items-center gap-1 break-all  hover:cursor-pointer mb-1",
        bordered &&
          "border-b-1 border-b-solid border-b-transparent hover:border-b-#cccccc"
      )}
      onClick={() => {
        Promise.resolve(typeof href === "function" ? href() : href).then(
          (href) => {
            if (type === "xrp") {
              // todo: remove the hard-code logic
              window.open(
                `https://testnet.xrpl.org${href}`,
                "_blank",
                "noopener"
              );
            } else {
              window.open(href, "_blank", "noopener");
            }
          }
        );
      }}
    >
      {children}
      {type === "xrp" ? <XrpLogoIcon /> : <IpfsLogoIcon />}
    </div>
  );
};

export default ScannerText;
