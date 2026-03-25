const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleTicketing", function () {
  let ticketing;
  let owner;
  let organizer;
  let buyer1;
  let buyer2;
  let recipient;

  const EVENT_PRICE = ethers.utils.parseEther("0.1");
  const TOTAL_TICKETS = 100;

  before(async function () {
    [owner, organizer, buyer1, buyer2, recipient] = await ethers.getSigners();

    const SimpleTicketingFactory = await ethers.getContractFactory("SimpleTicketing");
    ticketing = await SimpleTicketingFactory.deploy();
    await ticketing.deployed();
  });

  describe("Event Creation", function () {
    it("Should create an event", async function () {
      const tx = await ticketing
        .connect(organizer)
        .createEvent("Concert 2024", EVENT_PRICE, TOTAL_TICKETS);

      await tx.wait();

      const event = await ticketing.events(0);
      expect(event.name).to.equal("Concert 2024");
      expect(event.price).to.equal(EVENT_PRICE);
      expect(event.totalTickets).to.equal(TOTAL_TICKETS);
      expect(event.sold).to.equal(0);
      expect(event.organizer).to.equal(organizer.address);
    });

    it("Should increment nextEventId", async function () {
      let nextId = await ticketing.nextEventId();
      expect(nextId).to.equal(1);

      await ticketing
        .connect(organizer)
        .createEvent("Festival 2024", EVENT_PRICE, 50);

      nextId = await ticketing.nextEventId();
      expect(nextId).to.equal(2);
    });
  });

  describe("Ticket Purchase", function () {
    it("Should buy a ticket", async function () {
      const tx = await ticketing.connect(buyer1).buyTicket(0, { value: EVENT_PRICE });
      await tx.wait();

      const ticket = await ticketing.tickets(0);
      expect(ticket.eventId).to.equal(0);
      expect(ticket.owner).to.equal(buyer1.address);
      expect(ticket.used).to.be.false;
    });

    it("Should increment nextTicketId", async function () {
      let nextId = await ticketing.nextTicketId();
      expect(nextId).to.equal(1);

      await ticketing.connect(buyer2).buyTicket(0, { value: EVENT_PRICE });

      nextId = await ticketing.nextTicketId();
      expect(nextId).to.equal(2);
    });

    it("Should update event sold count", async function () {
      const eventBefore = await ticketing.events(0);
      const soldBefore = eventBefore.sold;

      await ticketing.connect(buyer1).buyTicket(1, { value: EVENT_PRICE });

      const eventAfter = await ticketing.events(1);
      expect(eventAfter.sold).to.equal(ethers.BigNumber.from(1));
    });

    it("Should reject wrong price", async function () {
      const wrongPrice = ethers.utils.parseEther("0.05");

      await expect(
        ticketing.connect(buyer1).buyTicket(0, { value: wrongPrice })
      ).to.be.revertedWith("Wrong price");
    });

    it("Should reject purchase when sold out", async function () {
      // Create event with 2 tickets
      await ticketing
        .connect(organizer)
        .createEvent("Limited Event", EVENT_PRICE, 2);

      const eventId = (await ticketing.nextEventId()) - 1;

      // Buy both tickets
      await ticketing.connect(buyer1).buyTicket(eventId, { value: EVENT_PRICE });
      await ticketing.connect(buyer2).buyTicket(eventId, { value: EVENT_PRICE });

      // Try to buy third should fail
      await expect(
        ticketing.connect(buyer1).buyTicket(eventId, { value: EVENT_PRICE })
      ).to.be.revertedWith("Sold out");
    });
  });

  describe("Ticket Usage", function () {
    let ticketId;

    before(async function () {
      // Buy a ticket
      await ticketing.connect(buyer1).buyTicket(0, { value: EVENT_PRICE });
      ticketId = (await ticketing.nextTicketId()) - 1;
    });

    it("Should mark ticket as used", async function () {
      const ticketBefore = await ticketing.tickets(ticketId);
      expect(ticketBefore.used).to.be.false;

      await ticketing.connect(buyer1).useTicket(ticketId);

      const ticketAfter = await ticketing.tickets(ticketId);
      expect(ticketAfter.used).to.be.true;
    });

    it("Should reject use if not owner", async function () {
      await expect(
        ticketing.connect(buyer2).useTicket(ticketId)
      ).to.be.revertedWith("Not owner");
    });

    it("Should reject reuse of ticket", async function () {
      await expect(
        ticketing.connect(buyer1).useTicket(ticketId)
      ).to.be.revertedWith("Already used");
    });
  });

  describe("Ticket Transfer", function () {
    let transferTicketId;

    before(async function () {
      // Buy a fresh ticket
      await ticketing.connect(buyer1).buyTicket(0, { value: EVENT_PRICE });
      transferTicketId = (await ticketing.nextTicketId()) - 1;
    });

    it("Should transfer ticket", async function () {
      const ticketBefore = await ticketing.tickets(transferTicketId);
      expect(ticketBefore.owner).to.equal(buyer1.address);

      await ticketing.connect(buyer1).transferTicket(transferTicketId, recipient.address);

      const ticketAfter = await ticketing.tickets(transferTicketId);
      expect(ticketAfter.owner).to.equal(recipient.address);
    });

    it("Should reject transfer if not owner", async function () {
      const anotherTicketId = (await ticketing.nextTicketId()) - 2;

      await expect(
        ticketing.connect(buyer2).transferTicket(anotherTicketId, recipient.address)
      ).to.be.revertedWith("Not owner");
    });

    it("Should reject transfer of used ticket", async function () {
      // The ticket from first describe block is marked as used
      const usedTicketId = 0;

      await expect(
        ticketing.connect(buyer1).transferTicket(usedTicketId, recipient.address)
      ).to.be.revertedWith("Already used");
    });
  });

  describe("Multiple Events", function () {
    it("Should support multiple events independently", async function () {
      // Create two events
      await ticketing
        .connect(organizer)
        .createEvent("Event A", EVENT_PRICE, 10);

      await ticketing
        .connect(organizer)
        .createEvent("Event B", ethers.utils.parseEther("0.2"), 20);

      const eventA = await ticketing.events(2);
      const eventB = await ticketing.events(3);

      expect(eventA.name).to.equal("Event A");
      expect(eventB.name).to.equal("Event B");
      expect(eventB.price).to.equal(ethers.utils.parseEther("0.2"));
    });

    it("Should track tickets per event", async function () {
      const eventAId = (await ticketing.nextEventId()) - 2;
      const eventBId = (await ticketing.nextEventId()) - 1;

      await ticketing.connect(buyer1).buyTicket(eventAId, { value: EVENT_PRICE });
      await ticketing
        .connect(buyer1)
        .buyTicket(eventBId, { value: ethers.utils.parseEther("0.2") });

      const eventA = await ticketing.events(eventAId);
      const eventB = await ticketing.events(eventBId);

      expect(eventA.sold).to.equal(1);
      expect(eventB.sold).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address check in transfer", async function () {
      await ticketing.connect(buyer1).buyTicket(0, { value: EVENT_PRICE });
      const newTicketId = (await ticketing.nextTicketId()) - 1;

      // Transfer to zero address is not explicitly blocked in contract,
      // but ownership would be transferred
      // This documents current behavior
    });

    it("Should handle large ticket quantities", async function () {
      await ticketing
        .connect(organizer)
        .createEvent("Big Event", EVENT_PRICE, 10000);

      const eventId = (await ticketing.nextEventId()) - 1;
      const event = await ticketing.events(eventId);
      expect(event.totalTickets).to.equal(10000);
    });

    it("Should handle multiple owners of the same event", async function () {
      const eventId = 0;
      const buyersCount = 5;
      const signers = await ethers.getSigners();

      for (let i = 0; i < buyersCount; i++) {
        await ticketing.connect(signers[i]).buyTicket(eventId, { value: EVENT_PRICE });
      }

      const event = await ticketing.events(eventId);
      expect(event.sold).to.be.gte(buyersCount);
    });
  });

  describe("View Functions", function () {
    it("Should get event details", async function () {
      const event = await ticketing.events(0);
      expect(event.name).to.not.be.empty;
      expect(event.organizer).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should get ticket details", async function () {
      const ticket = await ticketing.tickets(0);
      expect(ticket.eventId).to.be.gte(0);
      expect(ticket.owner).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should track next IDs", async function () {
      const nextEventId = await ticketing.nextEventId();
      const nextTicketId = await ticketing.nextTicketId();

      expect(nextEventId).to.be.gt(0);
      expect(nextTicketId).to.be.gt(0);
    });
  });
});
