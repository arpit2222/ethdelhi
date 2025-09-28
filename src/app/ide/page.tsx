"use client";

import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContractFactory, BrowserProvider } from "ethers";

type Language = "solidity" | "yul";

type CompileResponse = {
  success: boolean;
  errors?: Array<{
    type?: string;
    severity?: string;
    message: string;
    formattedMessage?: string;
  }>;
  contracts?: {
    [fileName: string]: {
      [contractName: string]: {
        abi?: any[];
        evm?: { bytecode?: { object?: string } };
        bytecode?: string; // for yul convenience
      };
    };
  };
};

const SOLIDITY_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;

    constructor(uint256 _initial) {
        count = _initial;
    }

    function inc() external {
        count += 1;
    }
}
`;

const YUL_TEMPLATE = `object "CounterYul" {
  code {
    // simple return 0 program (placeholder)
    mstore(0x00, 0x00)
    return(0x00, 0x20)
  }
}
`;

export default function IDEPage() {
  const [language, setLanguage] = useState<Language>("solidity");
  const [source, setSource] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(true);
  // keep minimal controls; use sensible defaults under the hood
  const [optimise] = useState<boolean>(true);
  const [runs] = useState<number>(200);
  const [evmVersion] = useState<string>("paris");
  const [viaIR] = useState<boolean>(false);
  const [compiling, setCompiling] = useState<boolean>(false);
  const [deploying, setDeploying] = useState<boolean>(false);
  const [compileOutput, setCompileOutput] = useState<CompileResponse | null>(null);
  const [selectedContract, setSelectedContract] = useState<string>("");
  // constructor args will be prompted on demand to keep UI minimal
  // Using global navbar for wallet/network. Keep IDE page minimal.
  const [deployedAddress, setDeployedAddress] = useState<string>("");
  const [deploymentTxHash, setDeploymentTxHash] = useState<string>("");
  const [deploymentChainId, setDeploymentChainId] = useState<number | null>(null);
  const [deploymentChainName, setDeploymentChainName] = useState<string>("");

  const notify = {
    success: (msg: string) => {
      if (typeof window !== "undefined") alert(msg);
      console.log("SUCCESS:", msg);
    },
    error: (msg: string) => {
      if (typeof window !== "undefined") alert(msg);
      console.error("ERROR:", msg);
    },
  };

  // Load & persist editor content per language
  useEffect(() => {
    const key = `ide-src-${language}`;
    const saved = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    setSource(saved ?? (language === "solidity" ? SOLIDITY_TEMPLATE : YUL_TEMPLATE));
  }, [language]);

  useEffect(() => {
    const key = `ide-src-${language}`;
    if (typeof window !== "undefined") {
      const id = setTimeout(() => localStorage.setItem(key, source), 300);
      return () => clearTimeout(id);
    }
  }, [language, source]);

  const contractsList = useMemo(() => {
    if (!compileOutput?.contracts) return [] as { value: string; label: string }[];
    const items: { value: string; label: string }[] = [];
    for (const file in compileOutput.contracts) {
      for (const name in compileOutput.contracts[file]) {
        items.push({ value: `${file}:${name}`, label: `${name}` });
      }
    }
    return items;
  }, [compileOutput]);

  // Sync Monaco theme with system preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setIsDark(!!mq?.matches);
    update();
    mq?.addEventListener?.('change', update);
    return () => mq?.removeEventListener?.('change', update);
  }, []);

  async function compileForDeploy(): Promise<{ abi?: any[]; bytecode?: string } | null> {
    try {
      setCompiling(true);
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, source, optimise, runs, evmVersion, viaIR }),
      });
      const data: CompileResponse = await res.json();
      setCompileOutput(data);
      if (!data.success) {
        notify.error("Compilation failed. Please fix errors.");
        return null;
      }
      const firstFile = Object.keys(data.contracts ?? {})?.[0];
      const firstName = firstFile ? Object.keys((data.contracts as any)[firstFile] ?? {})[0] : undefined;
      if (firstFile && firstName) setSelectedContract(`${firstFile}:${firstName}`);
      // return selected artifact
      const [file, name] = firstFile && firstName ? [firstFile, firstName] : ["", ""];
      if (file && name) {
        const entry = (data.contracts as any)[file][name];
        const bytecode = entry?.evm?.bytecode?.object || entry?.bytecode || "";
        const abi = entry?.abi || [];
        return { abi, bytecode };
      }
      notify.error("No contract found to deploy.");
      return null;
    } catch (e: any) {
      notify.error(e?.message ?? "Compilation error");
      return null;
    } finally {
      setCompiling(false);
    }
  }

  // Connection handled globally (RainbowKit/Wagmi). Deployment will prompt if needed.

  function getSelectedArtifact() {
    if (!compileOutput?.contracts || !selectedContract) return null as null | { abi?: any[]; bytecode?: string };
    const [file, name] = selectedContract.split(":");
    const entry = compileOutput.contracts[file]?.[name];
    if (!entry) return null;
    const bytecode = entry.evm?.bytecode?.object || (entry as any).bytecode || "";
    const abi = entry.abi || [];
    return { abi, bytecode };
  }

  // Build default constructor args based on ABI types (no prompt)
  function defaultForType(solType: string, components?: any[]): any {
    // Array types e.g., uint256[], uint256[3], tuple[], tuple[2]
    const arrayMatch = solType.match(/^(.*)\[(\d*)\]$/);
    if (arrayMatch) {
      const base = arrayMatch[1];
      const sizeStr = arrayMatch[2];
      if (sizeStr === "") return []; // dynamic array -> empty by default
      const size = parseInt(sizeStr, 10);
      return Array.from({ length: size }, () => defaultForType(base, components));
    }

    // Tuple (struct)
    if (solType === "tuple") {
      const vals = (components || []).map((c) => defaultForType(c.type, c.components));
      return vals; // return as array in position order
    }

    // Elementary types
    if (/^u?int(\d+)?$/.test(solType)) return 0;
    if (solType === "bool") return false;
    if (solType === "address" || solType === "address payable") return "0x0000000000000000000000000000000000000000";
    if (solType === "string") return "";
    if (solType === "bytes") return "0x";
    const bytesN = solType.match(/^bytes(\d+)$/);
    if (bytesN) {
      const n = parseInt(bytesN[1] || "1", 10);
      const hexLen = n * 2;
      return "0x" + "0".repeat(hexLen);
    }
    // Fallback
    return null;
  }

  function buildDefaultConstructorArgs(abi: any[]): any[] {
    const ctor = (abi || []).find((x: any) => x.type === "constructor");
    if (!ctor || !Array.isArray(ctor.inputs) || ctor.inputs.length === 0) return [];
    return ctor.inputs.map((inp: any) => defaultForType(inp.type, inp.components));
  }

  async function handleCompileOnly() {
    const art = await compileForDeploy();
    if (!art) return;
    notify.success("Compiled successfully");
  }

  // Ensure switching to a testnet (Sepolia) before deploying
  async function ensureSepolia() {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;
      // Sepolia chainId 0xaa36a7
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    } catch (switchError: any) {
      // If the chain is not added, try to add it
      if (switchError?.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addErr: any) {
          notify.error(addErr?.message || 'Failed to add Sepolia network');
        }
      } else {
        notify.error(switchError?.message || 'Failed to switch to Sepolia');
      }
    }
  }

  async function handleDeploy() {
    // always compile fresh before deploy for simplicity
    const art = await compileForDeploy();
    if (!art || !art.bytecode) return;
    try {
      setDeploying(true);
      if (typeof window === "undefined" || !(window as any).ethereum) {
        notify.error("No injected provider found.");
        return;
      }
      await ensureSepolia();
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      // Auto-fill constructor args with sensible defaults, no prompt
      const args: unknown[] = buildDefaultConstructorArgs(art.abi || []);
      const factory = new ContractFactory(art.abi ?? [], art.bytecode, signer);
      const contract = await factory.deploy(...(Array.isArray(args) ? args : []));
      const tx = contract.deploymentTransaction();
      const receipt = await tx?.wait();
      const address = contract.target as string;
      const network = await provider.getNetwork();
      setDeployedAddress(address || "");
      setDeploymentTxHash(tx?.hash || "");
      setDeploymentChainId(Number(network?.chainId ?? 0));
      setDeploymentChainName(network?.name || "");
      notify.success(`Deployed at ${address}`);
    } catch (e: any) {
      console.error(e);
      notify.error(e?.message ?? "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">IDE</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={language === "solidity" ? "default" : "secondary"} onClick={() => setLanguage("solidity")}>Solidity</Button>
        <Button variant={language === "yul" ? "default" : "secondary"} onClick={() => setLanguage("yul")}>Yul (Assembly)</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Editor
            height="55vh"
            defaultLanguage="plaintext"
            language="plaintext"
            value={source}
            onChange={(val) => setSource(val ?? "")}
            theme={isDark ? "vs-dark" : "light"}
            options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 8, bottom: 8 } as any }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 justify-end">
            <Button variant="secondary" onClick={handleCompileOnly} disabled={compiling}>
              {compiling ? "Compiling..." : "Compile"}
            </Button>
            <Button onClick={handleDeploy} disabled={deploying || compiling}>
              {deploying || compiling ? "Working..." : "Deploy (Sepolia)"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Errors / Warnings</Label>
              <textarea
                className="min-h-[160px] w-full border rounded p-2"
                readOnly
                value={(compileOutput?.errors ?? []).map(e => e.formattedMessage || e.message).join("\n")} />
            </div>
            <div>
              <Label>ABI / Bytecode</Label>
              <textarea
                className="min-h-[160px] w-full border rounded p-2"
                readOnly
                value={(() => {
                  const art = getSelectedArtifact();
                  if (!art) return "";
                  return JSON.stringify({ abi: art.abi, bytecode: art.bytecode }, null, 2);
                })()} />
            </div>
          </div>

          <div>
            <Label>Contract</Label>
            <select
              className="border rounded px-2 py-2 w-full"
              value={selectedContract}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedContract(e.target.value)}
            >
              <option value="">Select compiled contract</option>
              {contractsList.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {(deployedAddress || deploymentTxHash) && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deployedAddress && (
              <div className="flex items-center gap-2">
                <Label className="min-w-24">Address</Label>
                <code className="px-2 py-1 rounded bg-neutral-900 text-white break-all">
                  {deployedAddress}
                </code>
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(deployedAddress)}
                >
                  Copy
                </Button>
                {deploymentChainId === 11155111 && (
                  <a
                    className="underline text-blue-400"
                    href={`https://sepolia.etherscan.io/address/${deployedAddress}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Etherscan
                  </a>
                )}
              </div>
            )}
            {deploymentTxHash && (
              <div className="flex items-center gap-2">
                <Label className="min-w-24">Tx Hash</Label>
                <code className="px-2 py-1 rounded bg-neutral-900 text-white break-all">
                  {deploymentTxHash}
                </code>
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(deploymentTxHash)}
                >
                  Copy
                </Button>
                {deploymentChainId === 11155111 && (
                  <a
                    className="underline text-blue-400"
                    href={`https://sepolia.etherscan.io/tx/${deploymentTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Etherscan
                  </a>
                )}
              </div>
            )}
            {(deploymentChainId || deploymentChainName) && (
              <div className="flex items-center gap-2">
                <Label className="min-w-24">Network</Label>
                <span>
                  {deploymentChainName} ({deploymentChainId ?? ""})
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {deployedAddress && deploymentChainId === 11155111 && (
        <div className="flex justify-end">
          <a
            href={`https://sepolia.etherscan.io/address/${deployedAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button>Check on Etherscan</Button>
          </a>
        </div>
      )}
    </div>
  );
}

