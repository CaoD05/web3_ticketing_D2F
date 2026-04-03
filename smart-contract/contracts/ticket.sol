// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ticket is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    constructor(address initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(ADMIN_ROLE, initialOwner);
        _grantRole(ORGANIZER_ROLE, initialOwner);
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    modifier onlyOrganizer() {
        require(hasRole(ORGANIZER_ROLE, msg.sender), "Not organizer");
        _;
    }

    // 🔥 Replace onlyOwner with DEFAULT_ADMIN_ROLE
    modifier onlyOwner() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not owner");
        _;
    }

    function grantAdminRole(address account) public onlyOwner {
        grantRole(ADMIN_ROLE, account);
    }

    function revokeAdminRole(address account) public onlyOwner {
        revokeRole(ADMIN_ROLE, account);
    }

    function grantOrganizerRole(address account) public onlyOwner {
        grantRole(ORGANIZER_ROLE, account);
    }

    function revokeOrganizerRole(address account) public onlyOwner {
        revokeRole(ORGANIZER_ROLE, account);
    }

    uint public nextEventId;
    uint public nextTicketId;

    struct Event {
        string name;
        uint price;
        uint totalTickets;
        uint sold;
        address organizer;
    }

    struct Ticket {
        uint eventId;
        address owner;
        bool used;
    }

    mapping(uint => Event) public events;
    mapping(uint => Ticket) public tickets;
    mapping(address => uint) public withdrawableFunds;

    function createEvent(
        string memory _name,
        uint _price,
        uint _totalTickets
    ) public onlyOrganizer {
        require(_totalTickets > 0, "Total tickets must be greater than 0");
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_name).length > 0, "Event name cannot be empty");

        events[nextEventId] = Event(
            _name,
            _price,
            _totalTickets,
            0,
            msg.sender
        );

        nextEventId++;
    }

    function buyTicket(uint _eventId) public payable {
        Event storage e = events[_eventId];

        require(e.totalTickets > 0, "Event does not exist");
        require(msg.value == e.price, "Wrong price");
        require(e.sold < e.totalTickets, "Sold out");

        tickets[nextTicketId] = Ticket(
            _eventId,
            msg.sender,
            false
        );

        e.sold++;
        nextTicketId++;

        withdrawableFunds[e.organizer] += e.price;
    }

    function verifyTicket(uint _ticketId) public onlyAdmin {
        Ticket storage t = tickets[_ticketId];
        require(!t.used, "Ticket already used");
        t.used = true;
    }

    function useTicket(uint _ticketId) public {
        Ticket storage t = tickets[_ticketId];

        require(t.owner == msg.sender, "Not owner");
        require(!t.used, "Already used");

        t.used = true;
    }

    function transferTicket(uint _ticketId, address _to) public {
        Ticket storage t = tickets[_ticketId];

        require(t.owner == msg.sender, "Not owner");
        require(!t.used, "Already used");

        t.owner = _to;
    }

    function withdrawFunds() public {
        uint amount = withdrawableFunds[msg.sender];
        require(amount > 0, "No funds to withdraw");

        withdrawableFunds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }
}