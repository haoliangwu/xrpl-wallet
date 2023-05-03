import { PropsWithChildren } from "react";
import cls from "classnames";
import { useXrpLedgerClient } from "~/hooks/useXrpLedgerHook";
import { XrpLogoIcon, IpfsLogoIcon } from "./Icons";

const isTestNet = (s: string) => s.indexOf("altnet.rippletest.net");

const ScannerText: React.FC<
  PropsWithChildren<{ href: string; className?: string; type?: "xrp" | "ipfs" }>
> = ({ children, href, className, type = "xrp" }) => {
  const { network } = useXrpLedgerClient();

  return (
    <div
      className={cls(
        className,
        "flex-inline items-center gap-1 pb-1 border-b-1 border-b-solid border-b-transparent hover:border-b-#cccccc hover:cursor-pointer"
      )}
      onClick={() => {
        if (type === "xrp") {
          // todo: remove the hard-code logic
          window.open(`https://testnet.xrpl.org${href}`, "_blank", "noopener");
        } else {
          window.open(`https://ipfs.io/ipfs${href}`, "_blank", "noopener");
        }
      }}
    >
      {children}
      {type === "xrp" ? <XrpLogoIcon /> : <IpfsLogoIcon />}
    </div>
  );
};

export default ScannerText;
