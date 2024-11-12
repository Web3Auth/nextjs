"use client";

import { SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL, WEB3PAY_API_URL, WEB3PAY_TEST_TOKEN } from "@/config";
import { useEffect, useState } from "react";
import { createWalletClient, erc20Abi, getContract, http } from "viem";
import {
  generatePrivateKey,
  PrivateKeyAccount,
  privateKeyToAccount,
} from "viem/accounts";

interface ExternalSponsorProps {
  onEoaWalletFunded: (account: PrivateKeyAccount) => void;
}

export default function ExternalSponsor({
  onEoaWalletFunded,
}: ExternalSponsorProps) {
  const [loadingText, setLoadingText] = useState(
    "Generating random EOA wallet..."
  );
  const [eoaWallet, setEoaWallet] = useState<PrivateKeyAccount>();

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoadingText("Generating random EOA wallet...");
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);
        setEoaWallet(account);

        const walletClient = createWalletClient({
          account,
          chain: SOURCE_CHAIN,
          transport: http(SOURCE_CHAIN_RPC_URL),
        });

        const w3pToken = getContract({
          address: WEB3PAY_TEST_TOKEN,
          abi: erc20Abi,
          client: walletClient,
        });

        const balance = await w3pToken.read.balanceOf([account.address]);
        console.log("balance", balance);
        if (balance > 10n) {
          setLoadingText("EOA wallet already funded!");
          onEoaWalletFunded(account);
          return;
        }

        // funding test token to eoa wallet
        setLoadingText("Funding test token to EOA wallet...");

        const res = await fetch(`${WEB3PAY_API_URL}/mint`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: ac.signal,
          body: JSON.stringify({
            chainId: SOURCE_CHAIN.id,
            toAddress: account.address,
          }),
        });
        if (res.ok) {
          setLoadingText("EOA wallet funded!");
          onEoaWalletFunded(account);
        } else {
          setLoadingText("Failed to fund EOA wallet");
        }
      } catch (error) {
        if (ac.signal.aborted) return;
        console.error(error);
        setLoadingText("Failed to fund EOA wallet");
      }
    })();

    return () => ac.abort();
  }, [onEoaWalletFunded]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      {eoaWallet && (
        <p className="text-sm bg-gray-100 p-2 rounded-md text-gray-800">
          EOA address: {eoaWallet.address}
        </p>
      )}
      <p className="text-xs text-gray-800 dark:text-gray-200">{loadingText}</p>
    </div>
  );
}
