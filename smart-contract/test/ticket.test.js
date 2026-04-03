const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ticket Contract", function () {
  let ticket;
  let owner, admin, organizer, user1, user2;

  beforeEach(async function () {
    [owner, admin, organizer, user1, user2] = await ethers.getSigners();

    const Ticket = await ethers.getContractFactory("ticket");
    ticket = await Ticket.deploy(owner.address);
    await ticket.waitForDeployment();

    // Grant roles
    await ticket.grantAdminRole(admin.address);
    await ticket.grantOrganizerRole(organizer.address);
  });

  // -------------------
  // ROLES
  // -------------------
  describe("Roles", function () {
    it("Should grant admin role", async function () {
      expect(
        await ticket.hasRole(await ticket.ADMIN_ROLE(), admin.address)
      ).to.be.true;
    });

    it("Should revoke admin role", async function () {
      await ticket.revokeAdminRole(admin.address);

      expect(
        await ticket.hasRole(await ticket.ADMIN_ROLE(), admin.address)
      ).to.be.false;
    });

    it("Should grant organizer role", async function () {
      expect(
        await ticket.hasRole(await ticket.ORGANIZER_ROLE(), organizer.address)
      ).to.be.true;
    });
  });

  // -------------------
  // CREATE EVENT
  // -------------------
  describe("Create Event", function () {
    it("Should create event", async function () {
      await ticket.connect(organizer).createEvent(
        "Event 1",
        ethers.parseEther("0.1"),
        100
      );

      const event = await ticket.events(0);

      expect(event.name).to.equal("Event 1");
      expect(event.price).to.equal(ethers.parseEther("0.1"));
      expect(event.totalTickets).to.equal(100);
      expect(event.sold).to.equal(0);
      expect(event.organizer).to.equal(organizer.address);
    });

    it("Should fail if not organizer", async function () {
      await expect(
        ticket.connect(user1).createEvent(
          "Hack Event",
          ethers.parseEther("0.1"),
          100
        )
      ).to.be.revertedWith("Not organizer");
    });
  });

  // -------------------
  // BUY TICKET
  // -------------------
  describe("Buy Ticket", function () {
    beforeEach(async function () {
      await ticket.connect(organizer).createEvent(
        "Event",
        ethers.parseEther("0.1"),
        2
      );
    });

    it("Should buy ticket", async function () {
      await ticket.connect(user1).buyTicket(0, {
        value: ethers.parseEther("0.1"),
      });

      const t = await ticket.tickets(0);
      expect(t.owner).to.equal(user1.address);

      const e = await ticket.events(0);
      expect(e.sold).to.equal(1);
    });

    it("Should fail wrong price", async function () {
      await expect(
        ticket.connect(user1).buyTicket(0, {
          value: ethers.parseEther("0.05"),
        })
      ).to.be.revertedWith("Wrong price");
    });

    it("Should fail when sold out", async function () {
      await ticket.connect(user1).buyTicket(0, {
        value: ethers.parseEther("0.1"),
      });

      await ticket.connect(user2).buyTicket(0, {
        value: ethers.parseEther("0.1"),
      });

      await expect(
        ticket.connect(user2).buyTicket(0, {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWith("Sold out");
    });
  });

  // -------------------
  // VERIFY
  // -------------------
  describe("Verify Ticket", function () {
    beforeEach(async function () {
      await ticket.connect(organizer).createEvent(
        "Event",
        ethers.parseEther("0.1"),
        10
      );

      await ticket.connect(user1).buyTicket(0, {
        value: ethers.parseEther("0.1"),
      });
    });

    it("Admin can verify", async function () {
      await ticket.connect(admin).verifyTicket(0);

      const t = await ticket.tickets(0);
      expect(t.used).to.be.true;
    });

    it("Non-admin fails", async function () {
      await expect(
        ticket.connect(user1).verifyTicket(0)
      ).to.be.revertedWith("Not admin");
    });
  });

  // -------------------
  // USE TICKET
  // -------------------
  describe("Use Ticket", function () {
    beforeEach(async function () {
      await ticket.connect(organizer).createEvent(
        "Event",
        ethers.parseEther("0.1"),
        10
      );

      await ticket.connect(user1).buyTicket(0, {
        value: ethers.parseEther("0.1"),
      });
    });

    it("Owner can use ticket", async function () {
      await ticket.connect(user1).useTicket(0);

      const t = await ticket.tickets(0);
      expect(t.used).to.be.true;
    });

    it("Cannot reuse ticket", async function () {
      await ticket.connect(user1).useTicket(0);

      await expect(
        ticket.connect(user1).useTicket(0)
      ).to.be.revertedWith("Already used");
    });

    it("Non-owner fails", async function () {
      await expect(
        ticket.connect(user2).useTicket(0)
      ).to.be.revertedWith("Not owner");
    });
  });

  // -------------------
  // TRANSFER
  // -------------------
  describe("Transfer Ticket", function () {
    beforeEach(async function () {
      await ticket.connect(organizer).createEvent(
        "Event",
        ethers.parseEther("0.1"),
        10
      );

      await ticket.connect(user1).buyTicket(0, {
        value: ethers.parseEther("0.1"),
      });
    });

    it("Should transfer ticket", async function () {
      await ticket.connect(user1).transferTicket(0, user2.address);

      const t = await ticket.tickets(0);
      expect(t.owner).to.equal(user2.address);
    });

    it("Non-owner fails", async function () {
      await expect(
        ticket.connect(user2).transferTicket(0, user1.address)
      ).to.be.revertedWith("Not owner");
    });
  });

  // -------------------
  // WITHDRAW
  // -------------------
  describe("Withdraw", function () {
    beforeEach(async function () {
      await ticket.connect(organizer).createEvent(
        "Event",
        ethers.parseEther("0.1"),
        10
      );

      await ticket.connect(user1).buyTicket(0, {
        value: ethers.parseEther("0.1"),
      });
    });

    it("Organizer can withdraw", async function () {
      const before = await ethers.provider.getBalance(organizer.address);

      const tx = await ticket.connect(organizer).withdrawFunds();
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const after = await ethers.provider.getBalance(organizer.address);

      expect(after).to.be.gt(before - gasUsed);
    });

    it("Fails if no funds", async function () {
      await expect(
        ticket.connect(user2).withdrawFunds()
      ).to.be.revertedWith("No funds to withdraw");
    });
  });
});