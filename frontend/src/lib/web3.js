import { ethers } from "ethers";
import TicketingABI from "./Ticketing.abi.json";

const CONTRACT_ADDRESS = "0x6c577eA50f7fBB6a03e24Ea1bB9B2D2567A15c5A";

export async function getContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  return new ethers.Contract(CONTRACT_ADDRESS, TicketingABI, signer);
}

export async function createEventOnChain(name, priceWei, totalTickets, startTime, metaURL) {
  try {
    const contract = await getContract();
    const tx = await contract.createEvent(name, priceWei, totalTickets, startTime, metaURL);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Create event error:", error);
    throw error;
  }
}

export async function buyTicketOnChain(eventId, priceWei) {
  try {
    const contract = await getContract();
    const tx = await contract.buyTicket(eventId, { value: priceWei });
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Buy ticket error:", error);
    throw error;
  }
}

export async function signMessage(message) {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
}
