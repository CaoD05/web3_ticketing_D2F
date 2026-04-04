const { expect } = require("chai");
const { ethers }  = require("hardhat");

// Helper: current block timestamp + offset
const inFuture = (seconds = 3600) => Math.floor(Date.now() / 1000) + seconds;

describe("Ticket", function () {
  let ticket, owner, organizer, admin, buyer, buyer2, other;

  const PRICE     = ethers.parseEther("0.1");
  const START     = inFuture(3600); // 1 hour from now
  const ADMIN_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const ORGANIZER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZER_ROLE"));

  beforeEach(async () => {
    [owner, organizer, admin, buyer, buyer2, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Ticketing");
    ticket = await Factory.deploy(owner.address);
    await ticket.waitForDeployment();

    // Grant roles
    await ticket.connect(owner).grantOrganizerRole(organizer.address);
    await ticket.connect(owner).grantAdminRole(admin.address);
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", () => {
    it("grants DEFAULT_ADMIN, ADMIN, ORGANIZER to owner", async () => {
      expect(await ticket.hasRole(ADMIN_ROLE,     owner.address)).to.be.true;
      expect(await ticket.hasRole(ORGANIZER_ROLE, owner.address)).to.be.true;
    });

    it("grants roles to designated accounts", async () => {
      expect(await ticket.hasRole(ORGANIZER_ROLE, organizer.address)).to.be.true;
      expect(await ticket.hasRole(ADMIN_ROLE,     admin.address)).to.be.true;
    });
  });

  // ── Role management ────────────────────────────────────────────────────────

  describe("Role management", () => {
    it("owner can revoke organizer role", async () => {
      await ticket.connect(owner).revokeOrganizerRole(organizer.address);
      expect(await ticket.hasRole(ORGANIZER_ROLE, organizer.address)).to.be.false;
    });

    it("non-owner cannot grant roles", async () => {
      await expect(
        ticket.connect(other).grantAdminRole(other.address)
      ).to.be.reverted;
    });
  });

  // ── createEvent ────────────────────────────────────────────────────────────

  describe("createEvent", () => {
    it("organizer can create an event", async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 100, START);
      const e = await ticket.events(0);
      expect(e.name).to.equal("Concert");
      expect(e.price).to.equal(PRICE);
      expect(e.totalTickets).to.equal(100);
      expect(e.organizer).to.equal(organizer.address);
      expect(e.cancelled).to.be.false;
    });

    it("increments nextEventId", async () => {
      await ticket.connect(organizer).createEvent("A", PRICE, 10, START);
      await ticket.connect(organizer).createEvent("B", PRICE, 10, START);
      expect(await ticket.nextEventId()).to.equal(2);
    });

    it("rejects empty name", async () => {
      await expect(
        ticket.connect(organizer).createEvent("", PRICE, 10, START)
      ).to.be.revertedWith("Event name cannot be empty");
    });

    it("rejects zero price", async () => {
      await expect(
        ticket.connect(organizer).createEvent("X", 0, 10, START)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("rejects zero tickets", async () => {
      await expect(
        ticket.connect(organizer).createEvent("X", PRICE, 0, START)
      ).to.be.revertedWith("Total tickets must be greater than 0");
    });

    it("rejects past startTime", async () => {
      const past = Math.floor(Date.now() / 1000) - 1;
      await expect(
        ticket.connect(organizer).createEvent("X", PRICE, 10, past)
      ).to.be.revertedWith("Start must be in future");
    });

    it("non-organizer cannot create event", async () => {
      await expect(
        ticket.connect(other).createEvent("X", PRICE, 10, START)
      ).to.be.reverted;
    });
  });

  // ── cancelEvent ────────────────────────────────────────────────────────────

  describe("cancelEvent", () => {
    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 100, START);
    });

    it("organizer can cancel", async () => {
      await ticket.connect(organizer).cancelEvent(0);
      expect((await ticket.events(0)).cancelled).to.be.true;
    });

    it("admin can cancel", async () => {
      await ticket.connect(admin).cancelEvent(0);
      expect((await ticket.events(0)).cancelled).to.be.true;
    });

    it("other cannot cancel", async () => {
      await expect(ticket.connect(other).cancelEvent(0)).to.be.revertedWith("Not authorised");
    });

    it("cannot cancel twice", async () => {
      await ticket.connect(organizer).cancelEvent(0);
      await expect(ticket.connect(organizer).cancelEvent(0)).to.be.revertedWith("Already cancelled");
    });
  });

  // ── buyTicket ──────────────────────────────────────────────────────────────

  describe("buyTicket", () => {
    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 2, START);
    });

    it("buyer receives ticket and organizer gets funds", async () => {
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
      const t = await ticket.tickets(0);
      expect(t.owner).to.equal(buyer.address);
      expect(t.used).to.be.false;
      expect(await ticket.withdrawableFunds(organizer.address)).to.equal(PRICE);
    });

    it("rejects wrong price", async () => {
      await expect(
        ticket.connect(buyer).buyTicket(0, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("Wrong price");
    });

    it("rejects when sold out", async () => {
      await ticket.connect(buyer).buyTicket(0,  { value: PRICE });
      await ticket.connect(buyer2).buyTicket(0, { value: PRICE });
      await expect(
        ticket.connect(other).buyTicket(0, { value: PRICE })
      ).to.be.revertedWith("Sold out");
    });

    it("rejects on cancelled event", async () => {
      await ticket.connect(organizer).cancelEvent(0);
      await expect(
        ticket.connect(buyer).buyTicket(0, { value: PRICE })
      ).to.be.revertedWith("Event cancelled");
    });

    it("rejects non-existent event", async () => {
      await expect(
        ticket.connect(buyer).buyTicket(99, { value: PRICE })
      ).to.be.revertedWith("Event does not exist");
    });
  });

  // ── claimRefund ────────────────────────────────────────────────────────────

  describe("claimRefund", () => {
    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 10, START);
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
    });

    it("buyer gets refund after cancellation", async () => {
      await ticket.connect(organizer).cancelEvent(0);
      const before = await ethers.provider.getBalance(buyer.address);
      const tx = await ticket.connect(buyer).claimRefund(0);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;
      const after = await ethers.provider.getBalance(buyer.address);
      expect(after + gas - before).to.equal(PRICE);
    });

    it("cannot refund if event not cancelled", async () => {
      await expect(ticket.connect(buyer).claimRefund(0)).to.be.revertedWith("Event not cancelled");
    });

    it("cannot refund twice", async () => {
      await ticket.connect(organizer).cancelEvent(0);
      await ticket.connect(buyer).claimRefund(0);
      await expect(ticket.connect(buyer).claimRefund(0)).to.be.revertedWith("Ticket already used");
    });

    it("non-owner cannot refund", async () => {
      await ticket.connect(organizer).cancelEvent(0);
      await expect(ticket.connect(other).claimRefund(0)).to.be.revertedWith("Not owner");
    });
  });

  // ── useTicket ──────────────────────────────────────────────────────────────

  describe("useTicket", () => {
    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 10, START);
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
    });

    it("owner can use their ticket", async () => {
      await ticket.connect(buyer).useTicket(0);
      expect((await ticket.tickets(0)).used).to.be.true;
    });

    it("cannot use twice", async () => {
      await ticket.connect(buyer).useTicket(0);
      await expect(ticket.connect(buyer).useTicket(0)).to.be.revertedWith("Already used");
    });

    it("non-owner cannot use ticket", async () => {
      await expect(ticket.connect(other).useTicket(0)).to.be.revertedWith("Not owner");
    });
  });

  // ── verifyTicket ───────────────────────────────────────────────────────────

  describe("verifyTicket", () => {
    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 10, START);
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
    });

    it("admin can verify ticket", async () => {
      await ticket.connect(admin).verifyTicket(0);
      expect((await ticket.tickets(0)).used).to.be.true;
    });

    it("cannot verify already used ticket", async () => {
      await ticket.connect(admin).verifyTicket(0);
      await expect(ticket.connect(admin).verifyTicket(0)).to.be.revertedWith("Ticket already used");
    });

    it("non-admin cannot verify", async () => {
      await expect(ticket.connect(other).verifyTicket(0)).to.be.reverted;
    });
  });

  // ── transferTicket ─────────────────────────────────────────────────────────

  describe("transferTicket", () => {
    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 10, START);
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
    });

    it("owner can transfer ticket", async () => {
      await ticket.connect(buyer).transferTicket(0, buyer2.address);
      expect((await ticket.tickets(0)).owner).to.equal(buyer2.address);
    });

    it("cannot transfer used ticket", async () => {
      await ticket.connect(buyer).useTicket(0);
      await expect(
        ticket.connect(buyer).transferTicket(0, buyer2.address)
      ).to.be.revertedWith("Already used");
    });

    it("cannot transfer to zero address", async () => {
      await expect(
        ticket.connect(buyer).transferTicket(0, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("non-owner cannot transfer", async () => {
      await expect(
        ticket.connect(other).transferTicket(0, buyer2.address)
      ).to.be.revertedWith("Not owner");
    });
  });

  // ── resale ─────────────────────────────────────────────────────────────────

  describe("Resale", () => {
    const RESALE_PRICE = ethers.parseEther("0.11"); // within 120% cap

    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 10, START);
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
    });

    it("owner can list ticket for resale", async () => {
      await ticket.connect(buyer).listForResale(0, RESALE_PRICE);
      expect((await ticket.tickets(0)).resalePrice).to.equal(RESALE_PRICE);
    });

    it("rejects price above 120% cap", async () => {
      const tooHigh = ethers.parseEther("0.13");
      await expect(
        ticket.connect(buyer).listForResale(0, tooHigh)
      ).to.be.revertedWith("Bad price");
    });

    it("buyer2 can buy resale ticket", async () => {
      await ticket.connect(buyer).listForResale(0, RESALE_PRICE);
      await ticket.connect(buyer2).buyResale(0, { value: RESALE_PRICE });
      expect((await ticket.tickets(0)).owner).to.equal(buyer2.address);
    });

    it("seller receives 98% of resale price", async () => {
      await ticket.connect(buyer).listForResale(0, RESALE_PRICE);
      await ticket.connect(buyer2).buyResale(0, { value: RESALE_PRICE });
      const fee      = RESALE_PRICE * 2n / 100n;
      const expected = RESALE_PRICE - fee;
      expect(await ticket.withdrawableFunds(buyer.address)).to.equal(expected);
    });

    it("cannot buy own resale ticket", async () => {
      await ticket.connect(buyer).listForResale(0, RESALE_PRICE);
      await expect(
        ticket.connect(buyer).buyResale(0, { value: RESALE_PRICE })
      ).to.be.revertedWith("Cannot buy own ticket");
    });

    it("owner can delist", async () => {
      await ticket.connect(buyer).listForResale(0, RESALE_PRICE);
      await ticket.connect(buyer).delistResale(0);
      expect((await ticket.tickets(0)).resalePrice).to.equal(0);
    });
  });

  // ── withdrawFunds ──────────────────────────────────────────────────────────

  describe("withdrawFunds", () => {
    beforeEach(async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 10, START);
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
    });

    it("organizer can withdraw proceeds", async () => {
      const before = await ethers.provider.getBalance(organizer.address);
      const tx     = await ticket.connect(organizer).withdrawFunds();
      const receipt = await tx.wait();
      const gas    = receipt.gasUsed * receipt.gasPrice;
      const after  = await ethers.provider.getBalance(organizer.address);
      expect(after + gas - before).to.equal(PRICE);
    });

    it("cannot withdraw with no balance", async () => {
      await expect(ticket.connect(other).withdrawFunds()).to.be.revertedWith("No funds to withdraw");
    });

    it("cannot withdraw twice", async () => {
      await ticket.connect(organizer).withdrawFunds();
      await expect(ticket.connect(organizer).withdrawFunds()).to.be.revertedWith("No funds to withdraw");
    });
  });

  // ── remainingTickets ───────────────────────────────────────────────────────

  describe("remainingTickets", () => {
    it("returns correct count after purchases", async () => {
      await ticket.connect(organizer).createEvent("Concert", PRICE, 3, START);
      expect(await ticket.remainingTickets(0)).to.equal(3);
      await ticket.connect(buyer).buyTicket(0, { value: PRICE });
      expect(await ticket.remainingTickets(0)).to.equal(2);
    });
  });
});
