import { ethers } from "ethers";
import { wrapEthereumProvider } from "@oasisprotocol/sapphire-paratime";
import TicketingABI from "./Ticketing.abi.json";

const CONTRACT_ADDRESS = "0x6F0e5e432497FA4f222dd98CC5e50fc62b2f66Dd";

const SAPPHIRE_TESTNET_CONFIG = {
  chainId: "0x5aff", // 23295 in hex (Oasis Sapphire Testnet)
  chainName: "Oasis Sapphire Testnet",
  nativeCurrency: {
    name: "Oasis ROSE",
    symbol: "ROSE",
    decimals: 18,
  },
  rpcUrls: ["https://testnet.sapphire.oasis.io"],
  blockExplorerUrls: ["https://explorer.oasis.io/testnet/sapphire"],
};

export async function ensureCorrectNetwork() {
  if (!window.ethereum) return;
  
  const targetChainIdHex = SAPPHIRE_TESTNET_CONFIG.chainId.toLowerCase();

  try {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId.toLowerCase() === targetChainIdHex) {
      return;
    }

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainIdHex }],
    });
  } catch (switchError) {
    if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain ID")) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SAPPHIRE_TESTNET_CONFIG],
        });
      } catch (addError) {
        throw new Error("Vui lòng thêm mạng Oasis Sapphire vào MetaMask.");
      }
    } else {
      throw new Error("Vui lòng chuyển sang mạng Oasis Sapphire trong MetaMask.");
    }
  }
}

/**
 * Initialize a Sapphire-wrapped provider for confidential transactions
 */
export async function getSapphireSigner() {
    if (!window.ethereum) throw new Error("MetaMask not found");
    await ensureCorrectNetwork();

    // Wrap for Sapphire encryption
    const wrappedProvider = wrapEthereumProvider(window.ethereum);
    const provider = new ethers.BrowserProvider(wrappedProvider);
    return await provider.getSigner();
}

export async function getContract() {
  const signer = await getSapphireSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, TicketingABI, signer);
}

export async function createEventOnChain(name, priceWei, totalTickets, startTime, metaURL) {
  try {
    const contract = await getContract();
    
    // Ensure correct types
    const _price = window.BigInt(priceWei.toString());
    const _total = window.BigInt(totalTickets.toString());
    const _start = window.BigInt(startTime.toString());

    console.log("[Web3] Calling createEvent with wrapped provider...");

    // Using high-level contract call allows Sapphire wrapper to handle encryption automatically
    const tx = await contract.createEvent(name, _price, _total, _start, metaURL, {
      gasLimit: 800000 
    });
    
    console.log("[Web3] Transaction submitted:", tx.hash);
    const receipt = await tx.wait();
    
    if (receipt.status === 0) {
      throw new Error("Giao dịch bị từ chối (Reverted).");
    }

    return tx.hash;
  } catch (error) {
    console.error("[Web3] Create event error:", error);
    
    // Extract revert reason
    let message = error.message;
    if (error.reason) message = error.reason;
    if (error.data) message += ` (Data: ${error.data})`;
    
    throw new Error(message || "Lỗi giao dịch Blockchain");
  }
}

export async function buyTicketOnChain(eventId, priceWei) {
  try {
    const signer = await getSapphireSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TicketingABI, signer);
    
    const _eventId = window.BigInt(eventId.toString());
    const _value = window.BigInt(priceWei.toString());
    const userAddr = await signer.getAddress();

    console.log(`[Web3] Preparing purchase: Event ${_eventId}, Value ${_value}, Buyer ${userAddr}`);

    // PREFLIGHT DRY-RUN using estimateGas
    // estimateGas is more reliable at detecting reverts while preserving msg.sender on Sapphire
    try {
        await contract.buyTicket.estimateGas(_eventId, { value: _value });
        console.log("[Web3] Purchase preflight (gas estimation) successful!");
    } catch (preflightError) {
        console.error("[Web3] Preflight failed:", preflightError);
        // If it's a genuine contract revert, we catch it here
        const reason = preflightError.reason || preflightError.message || "";
        if (reason.includes("Cooldown") || reason.includes("started") || reason.includes("price")) {
            throw new Error(`Không thể mua vé: ${reason}`);
        }
        // If it's a generic Sapphire/Provider error, we try to proceed anyway to let Metamask handle it
        console.warn("[Web3] Preflight had a technical error, attempting real transaction anyway...");
    }

    const tx = await contract.buyTicket(_eventId, { 
        value: _value, 
        gasLimit: 800000 
    });
    
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Buy ticket error:", error);
    throw error;
  }
}

export async function checkInTicketOnChain(ticketId) {
  try {
    const signer = await getSapphireSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TicketingABI, signer);
    const _ticketId = window.BigInt(ticketId.toString());

    // PREFLIGHT DRY-RUN
    try {
        const from = await signer.getAddress();
        await contract.useTicket.staticCall(_ticketId, { from });
    } catch (preflightError) {
        const reason = preflightError.reason || preflightError.message || "Lỗi điều kiện Check-In";
        throw new Error(`Không thể Check-In: ${reason}`);
    }

    const tx = await contract.useTicket(_ticketId, { gasLimit: 300000 });
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Use ticket error:", error);
    throw error;
  }
}

export async function refundTicketOnChain(ticketId) {
  try {
    const contract = await getContract();
    const tx = await contract.refundTicket(ticketId, { gasLimit: 400000 });
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Refund error:", error);
    throw error;
  }
}

export async function airdropTicketsOnChain(eventId, recipients) {
  try {
    const contract = await getContract();
    const _eventId = window.BigInt(eventId.toString());
    
    console.log(`[Web3] Airdropping tickets for event ${_eventId} to ${recipients.length} wallets...`);
    
    const tx = await contract.airdropTickets(_eventId, recipients, {
      gasLimit: window.BigInt(recipients.length * 200000) // 200k gas per recipient buffer
    });
    
    console.log("[Web3] Airdrop Tx Sent:", tx.hash);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Airdrop error:", error);
    throw error;
  }
}

export async function cancelEventOnChain(eventId) {
  try {
    const contract = await getContract();
    const tx = await contract.cancelEvent(eventId, { gasLimit: 300000 });
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Cancel event error:", error);
    throw error;
  }
}

export async function signMessage(message) {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
}
