// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Ticketing is AccessControl, ReentrancyGuard {

    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    uint public nextEventId;
    uint public nextTicketId;

    struct Event {
        string  name;
        uint    price;
        uint    totalTickets;
        uint    sold;
        uint    startTime;
        address organizer;
        bool    cancelled;
        string MetaURL; // optional URL for event metadata (e.g. IPFS link)
    }

    struct Ticket {
        uint    eventId;
        address owner;
        bool    used;
        uint    resalePrice; // 0 = not listed
    }

    mapping(uint => Event)   public events;
    mapping(uint => Ticket)  public tickets;
    mapping(address => uint) public withdrawableFunds;

    event EventCreated  (uint indexed eventId, string name, uint price, uint totalTickets, address organizer);
    event EventCancelled(uint indexed eventId);
    event TicketPurchased(uint indexed ticketId, uint indexed eventId, address indexed buyer);
    event TicketUsed    (uint indexed ticketId);
    event TicketVerified(uint indexed ticketId);
    event TicketTransferred(uint indexed ticketId, address from, address to);
    event ResaleListed  (uint indexed ticketId, uint price);
    event ResaleSold    (uint indexed ticketId, address from, address to, uint price);
    event FundsWithdrawn(address indexed to, uint amount);
    event RefundIssued  (address indexed to, uint amount);

    constructor(address initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(ADMIN_ROLE,         initialOwner);
        _grantRole(ORGANIZER_ROLE,     initialOwner);
    }

    modifier onlyOwner() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not owner");
        _;
    }

    // ── Role management ──────────────────────────────────────────────────────

    function grantAdminRole(address account)     public onlyOwner { grantRole(ADMIN_ROLE,      account); }
    function revokeAdminRole(address account)    public onlyOwner { revokeRole(ADMIN_ROLE,     account); }
    function grantOrganizerRole(address account) public onlyOwner { grantRole(ORGANIZER_ROLE,  account); }
    function revokeOrganizerRole(address account)public onlyOwner { revokeRole(ORGANIZER_ROLE, account); }

    // ── Events ───────────────────────────────────────────────────────────────

    function createEvent(string memory _name, uint _price, uint _totalTickets, uint _startTime)
        public onlyRole(ORGANIZER_ROLE)
    {
        require(bytes(_name).length > 0, "Event name cannot be empty");
        require(_price > 0,              "Price must be greater than 0");
        require(_totalTickets > 0,       "Total tickets must be greater than 0");
        require(_startTime > block.timestamp, "Start must be in future");

        events[nextEventId] = Event(_name, _price, _totalTickets, 0, _startTime, msg.sender, false, "");
        emit EventCreated(nextEventId, _name, _price, _totalTickets, msg.sender);
        nextEventId++;
    }

    function cancelEvent(uint _eventId) public {
        Event storage e = events[_eventId];
        require(msg.sender == e.organizer || hasRole(ADMIN_ROLE, msg.sender), "Not authorised");
        require(!e.cancelled, "Already cancelled");
        e.cancelled = true;
        emit EventCancelled(_eventId);
    }

    // ── Buy & refund ─────────────────────────────────────────────────────────

    function buyTicket(uint _eventId) public payable nonReentrant {
        Event storage e = events[_eventId];
        require(e.totalTickets > 0,            "Event does not exist");
        require(!e.cancelled,                  "Event cancelled");
        require(block.timestamp < e.startTime, "Event already started");
        require(msg.value == e.price,          "Wrong price");
        require(e.sold < e.totalTickets,       "Sold out");

        tickets[nextTicketId] = Ticket(_eventId, msg.sender, false, 0);
        withdrawableFunds[e.organizer] += e.price;
        emit TicketPurchased(nextTicketId, _eventId, msg.sender);
        e.sold++;
        nextTicketId++;
    }

    function claimRefund(uint _ticketId) public nonReentrant {
        Ticket storage t = tickets[_ticketId];
        require(t.owner == msg.sender, "Not owner");
        require(!t.used,               "Ticket already used");

        Event storage e = events[t.eventId];
        require(e.cancelled, "Event not cancelled");

        uint refund = e.price;
        t.used = true;
        if (withdrawableFunds[e.organizer] >= refund) withdrawableFunds[e.organizer] -= refund;

        (bool ok,) = payable(msg.sender).call{value: refund}("");
        require(ok, "Refund failed");
        emit RefundIssued(msg.sender, refund);
    }

    // ── Ticket usage ─────────────────────────────────────────────────────────

    function useTicket(uint _ticketId) public {
        Ticket storage t = tickets[_ticketId];
        require(t.owner == msg.sender,       "Not owner");
        require(!t.used,                     "Already used");
        require(!events[t.eventId].cancelled,"Event cancelled");
        t.used = true;
        emit TicketUsed(_ticketId);
    }

    function verifyTicket(uint _ticketId) public onlyRole(ADMIN_ROLE) {
        Ticket storage t = tickets[_ticketId];
        require(!t.used,                     "Ticket already used");
        require(!events[t.eventId].cancelled,"Event cancelled");
        t.used = true;
        emit TicketVerified(_ticketId);
    }

    // ── Transfer ─────────────────────────────────────────────────────────────

    function transferTicket(uint _ticketId, address _to) public {
        Ticket storage t = tickets[_ticketId];
        require(t.owner == msg.sender, "Not owner");
        require(!t.used,               "Already used");
        require(_to != address(0),     "Invalid recipient");
        t.owner = _to;
        t.resalePrice = 0; // delist if transferred
        emit TicketTransferred(_ticketId, msg.sender, _to);
    }

    // ── Resale ───────────────────────────────────────────────────────────────

    function listForResale(uint _ticketId, uint _price) public {
        Ticket storage t = tickets[_ticketId];
        Event storage e  = events[t.eventId];
        require(t.owner == msg.sender,         "Not owner");
        require(!t.used,                       "Already used");
        require(!e.cancelled,                  "Event cancelled");
        require(block.timestamp < e.startTime, "Event already started");
        require(_price > 0 && _price <= (e.price * 120) / 100, "Bad price");
        t.resalePrice = _price;
        emit ResaleListed(_ticketId, _price);
    }

    function delistResale(uint _ticketId) public {
        require(tickets[_ticketId].owner == msg.sender, "Not owner");
        tickets[_ticketId].resalePrice = 0;
    }

    function buyResale(uint _ticketId) public payable nonReentrant {
        Ticket storage t = tickets[_ticketId];
        require(t.resalePrice > 0, "Not listed");
        require(!t.used,           "Already used");

        Event storage e = events[t.eventId];
        require(!e.cancelled && block.timestamp < e.startTime, "Unavailable");
        require(msg.value == t.resalePrice, "Wrong price");

        address seller = t.owner;
        require(seller != msg.sender, "Cannot buy own ticket");

        uint fee = (msg.value * 2) / 100;
        t.owner       = msg.sender;
        t.resalePrice = 0;
        withdrawableFunds[seller]       += msg.value - fee;
        withdrawableFunds[e.organizer]  += fee; // fee goes back to organizer
        emit ResaleSold(_ticketId, seller, msg.sender, msg.value);
    }

    // ── Withdraw ─────────────────────────────────────────────────────────────

    function withdrawFunds() public nonReentrant {
        uint amount = withdrawableFunds[msg.sender];
        require(amount > 0, "No funds to withdraw");
        withdrawableFunds[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit FundsWithdrawn(msg.sender, amount);
    }

    // ── View ─────────────────────────────────────────────────────────────────

    function remainingTickets(uint _eventId) public view returns (uint) {
        return events[_eventId].totalTickets - events[_eventId].sold;
    }
}