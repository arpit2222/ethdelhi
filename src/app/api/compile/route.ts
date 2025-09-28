import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Lazy import solc at runtime to avoid bundling issues
async function loadSolc() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const solc: any = require("solc");
  return solc;
}

function buildSolidityInput(source: string, optimise: boolean, runs: number, evmVersion?: string, viaIR?: boolean) {
  return {
    language: "Solidity",
    sources: {
      "Input.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: optimise, runs },
      evmVersion,
      viaIR,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "metadata"],
        },
      },
    },
  };
}

function buildYulInput(source: string, optimise: boolean, runs: number, evmVersion?: string) {
  // Yul compilation uses same JSON format but language = Yul
  return {
    language: "Yul",
    sources: {
      "Input.yul": { content: source },
    },
    settings: {
      optimizer: { enabled: optimise, runs },
      evmVersion,
      outputSelection: {
        "*": {
          "*": ["evm.bytecode.object"],
        },
      },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, source, optimise = true, runs = 200, evmVersion, viaIR } = body as {
      language: "solidity" | "yul";
      source: string;
      optimise?: boolean;
      runs?: number;
      evmVersion?: string;
      viaIR?: boolean;
    };

    if (!source || typeof source !== "string") {
      return Response.json({ success: false, errors: [{ message: "Missing source" }] }, { status: 400 });
    }

    const solc = await loadSolc();

    const input = language === "yul"
      ? buildYulInput(source, optimise, runs, evmVersion)
      : buildSolidityInput(source, optimise, runs, evmVersion, viaIR);

    const outputRaw = solc.compile(JSON.stringify(input));
    const output = JSON.parse(outputRaw);

    const errors = (output.errors || []).map((e: any) => ({
      type: e.type,
      severity: e.severity,
      message: e.message,
      formattedMessage: e.formattedMessage,
    }));

    const contracts: Record<string, any> = {};

    if (output.contracts) {
      // Solidity output shape: contracts[filename][contractName]
      Object.entries<any>(output.contracts).forEach(([file, byName]) => {
        contracts[file] = contracts[file] || {};
        Object.entries<any>(byName).forEach(([name, art]) => {
          contracts[file][name] = {
            abi: art.abi ?? [],
            evm: art.evm ?? {},
          };
        });
      });
    }

    // For Yul, output.contracts may also exist with a synthetic name depending on solc version; normalize
    if (language === "yul" && output.contracts && Object.keys(output.contracts).length > 0) {
      const file = Object.keys(output.contracts)[0];
      const byName = (output.contracts as any)[file];
      const firstName = Object.keys(byName)[0];
      const bytecode = byName[firstName]?.evm?.bytecode?.object ?? "";
      contracts[file] = contracts[file] || {};
      contracts[file][firstName] = { abi: [], evm: { bytecode: { object: bytecode } }, bytecode };
    }

    const success = !errors.some((e: any) => e.severity === "error");

    return Response.json({ success, errors, contracts });
  } catch (e: any) {
    return Response.json({ success: false, errors: [{ message: e?.message ?? "Compile failed" }] }, { status: 500 });
  }
}
