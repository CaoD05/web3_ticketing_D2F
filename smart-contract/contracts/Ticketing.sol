// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Ticketing is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard {

    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    uint public nextEventId;
    uint public nextTicketId;
    uint public constant MAX_TICKETS_PER_BUYER = 5;

    struct Event {
        string  name;
        uint    price;
        uint    totalTickets;
        uint    sold;
        uint    startTime;
        address organizer;
        bool    cancelled;
        string MetaURL; // (IPFS link)
    }

    struct Ticket {
        uint    eventId;
        bool    used;
        uint    resalePrice; // 0 = not listed
    }

    mapping(uint => Event)   public events;
    mapping(uint => Ticket)  private tickets;
    mapping(address => uint) public withdrawableFunds;
    mapping(uint => mapping(address => uint)) public ticketsBought;
    mapping(address => uint) public lastPurchaseTime;

    event EventCreated  (uint indexed eventId, string name, uint price, uint totalTickets, address organizer, string metaURL);
    event EventCancelled(uint indexed eventId);
    event TicketPurchased(uint indexed ticketId, uint indexed eventId, address indexed buyer);
    event TicketAirdropped(uint indexed ticketId, uint indexed eventId, address indexed recipient);
    event TicketUsed    (uint indexed ticketId);
    event TicketVerified(uint indexed ticketId);
    event TicketTransferred(uint indexed ticketId, address from, address to);
    event ResaleListed  (uint indexed ticketId, uint price);
    event ResaleSold    (uint indexed ticketId, address from, address to, uint price);
    event FundsWithdrawn(address indexed to, uint amount);
    event RefundIssued  (address indexed to, uint amount);

    constructor(address initialOwner) 
        ERC721("Ticketing NFT", "TICKET")
    {
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

    function createEvent(string memory _name, uint _price, uint _totalTickets, uint _startTime, string memory _metaURL)
        public 
    {
        require(hasRole(ORGANIZER_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Missing role");
        require(bytes(_name).length > 0, "Event name cannot be empty");
        require(_price > 0,              "Price must be greater than 0");
        require(_totalTickets > 0,       "Total tickets must be greater than 0");
        require(_startTime > block.timestamp, "Start must be in future");

        events[nextEventId] = Event(_name, _price, _totalTickets, 0, _startTime, msg.sender, false, _metaURL);
        emit EventCreated(nextEventId, _name, _price, _totalTickets, msg.sender, _metaURL);
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
        require(ticketsBought[_eventId][msg.sender] < MAX_TICKETS_PER_BUYER, "Limit reached");
        require(block.timestamp >= lastPurchaseTime[msg.sender] + 1 minutes, "Anti-scalper: Cooldown active");

        uint ticketId = nextTicketId;
        tickets[ticketId] = Ticket(_eventId, false, 0);
        
        // Mint the NFT to the buyer and set metadata URI
        _mint(msg.sender, ticketId);
        _setTokenURI(ticketId, e.MetaURL);
        
        withdrawableFunds[e.organizer] += e.price;
        ticketsBought[_eventId][msg.sender]++;
        lastPurchaseTime[msg.sender] = block.timestamp;
        
        emit TicketPurchased(ticketId, _eventId, msg.sender);
        e.sold++;
        nextTicketId++;
    }

    /**
     * airdropTickets — Bulk mint free sponsor tickets
     */
    function airdropTickets(uint _eventId, address[] calldata _recipients) public {
        Event storage e = events[_eventId];
        require(msg.sender == e.organizer || hasRole(ADMIN_ROLE, msg.sender), "Not authorised");
        require(!e.cancelled, "Event cancelled");
        require(e.sold + _recipients.length <= e.totalTickets, "Not enough tickets left");

        for (uint i = 0; i < _recipients.length; i++) {
            uint ticketId = nextTicketId;
            tickets[ticketId] = Ticket(_eventId, false, 0);
            
            _mint(_recipients[i], ticketId);
            _setTokenURI(ticketId, e.MetaURL);
            
            emit TicketAirdropped(ticketId, _eventId, _recipients[i]);
            e.sold++;
            nextTicketId++;
        }
    }

    /**
     * refundTicket — Voluntary 80% refund before event starts
     */
    function refundTicket(uint _ticketId) public nonReentrant {
        Ticket storage t = tickets[_ticketId];
        require(ownerOf(_ticketId) == msg.sender, "Not owner");
        require(!t.used, "Already used");
        
        Event storage e = events[t.eventId];
        require(!e.cancelled, "Use claimRefund for cancelled events");
        require(block.timestamp < e.startTime, "Event already started");

        uint originalPrice = e.price;
        uint refundAmount = (originalPrice * 80) / 100;
        
        require(withdrawableFunds[e.organizer] >= refundAmount, "Insufficient organizer funds for refund");
        
        t.used = true;
        withdrawableFunds[e.organizer] -= refundAmount;
        
        _burn(_ticketId);
        
        (bool ok,) = payable(msg.sender).call{value: refundAmount}("");
        require(ok, "Refund transfer failed");
        
        emit RefundIssued(msg.sender, refundAmount);
    }

    function claimRefund(uint _ticketId) public nonReentrant {
        Ticket storage t = tickets[_ticketId];
        require(ownerOf(_ticketId) == msg.sender, "Not owner");
        require(!t.used,               "Ticket already used");

        Event storage e = events[t.eventId];
        require(e.cancelled, "Event not cancelled");

        uint refund = e.price;
        t.used = true;
        if (withdrawableFunds[e.organizer] >= refund) withdrawableFunds[e.organizer] -= refund;

        // Burn the ticket NFT
        _burn(_ticketId);

        (bool ok,) = payable(msg.sender).call{value: refund}("");
        require(ok, "Refund failed");
        emit RefundIssued(msg.sender, refund);
    }

    // ── Ticket usage ─────────────────────────────────────────────────────────

    function useTicket(uint _ticketId) public {
        Ticket storage t = tickets[_ticketId];
        require(ownerOf(_ticketId) == msg.sender,       "Not owner");
        require(!t.used,                     "Already used");
        
        Event storage e = events[t.eventId];
        require(!e.cancelled,"Event cancelled");
        require(block.timestamp >= e.startTime - 24 hours, "Too early to check-in");
        
        t.used = true;
        emit TicketUsed(_ticketId);
    }

    function verifyTicket(uint _ticketId) public onlyRole(ADMIN_ROLE) {
        Ticket storage t = tickets[_ticketId];
        require(!t.used,                     "Ticket already used");
        
        Event storage e = events[t.eventId];
        require(!e.cancelled,"Event cancelled");
        require(block.timestamp >= e.startTime - 24 hours, "Too early to verify");

        t.used = true;
        emit TicketVerified(_ticketId);
    }

    // ── Transfer ─────────────────────────────────────────────────────────────

    function transferTicket(uint _ticketId, address _to) public {
        Ticket storage t = tickets[_ticketId];
        require(ownerOf(_ticketId) == msg.sender, "Not owner");
        require(!t.used,               "Already used");
        require(_to != address(0),     "Invalid recipient");
        
        t.resalePrice = 0; // delist if transferred
        
        // Use ERC721's transferFrom to update ownership
        _transfer(msg.sender, _to, _ticketId);
        emit TicketTransferred(_ticketId, msg.sender, _to);
    }

    // ── Resale ───────────────────────────────────────────────────────────────

    function listForResale(uint _ticketId, uint _price) public {
        Ticket storage t = tickets[_ticketId];
        Event storage e  = events[t.eventId];
        require(ownerOf(_ticketId) == msg.sender,         "Not owner");
        require(!t.used,                       "Already used");
        require(!e.cancelled,                  "Event cancelled");
        require(block.timestamp < e.startTime, "Event already started");
        require(_price > 0 && _price <= (e.price * 120) / 100, "Bad price");
        t.resalePrice = _price;
        emit ResaleListed(_ticketId, _price);
    }

    function delistResale(uint _ticketId) public {
        require(ownerOf(_ticketId) == msg.sender, "Not owner");
        tickets[_ticketId].resalePrice = 0;
    }

    function buyResale(uint _ticketId) public payable nonReentrant {
        Ticket storage t = tickets[_ticketId];
        require(t.resalePrice > 0, "Not listed");
        require(!t.used,           "Already used");

        Event storage e = events[t.eventId];
        require(!e.cancelled && block.timestamp < e.startTime, "Unavailable");
        require(msg.value == t.resalePrice, "Wrong price");

        address seller = ownerOf(_ticketId);
        require(seller != msg.sender, "Cannot buy own ticket");

        uint fee = (msg.value * 2) / 100;
        t.resalePrice = 0;
        
        // Transfer NFT from seller to buyer
        _transfer(seller, msg.sender, _ticketId);
        
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

    function getTicketDetails(uint _ticketId) public view returns (Ticket memory) {
        require(ownerOf(_ticketId) == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorised");
        return tickets[_ticketId];
    }

    // ── Required ERC721 overrides ─────────────────────────────────────────────

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        string memory _uri = super.tokenURI(tokenId);
        // If it's a raw CID (no protocol), prepend ipfs://
        if (bytes(_uri).length > 0 && bytes(_uri)[0] != 'h' && bytes(_uri)[0] != 'i') {
            return string.concat("ipfs://", _uri);
        }
        return _uri;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}