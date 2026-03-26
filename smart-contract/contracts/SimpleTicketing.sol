// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleTicketing {

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

    // -------------------
    // CREATE EVENT
    // -------------------
    function createEvent(
        string memory _name,
        uint _price,
        uint _totalTickets
    ) public {
        events[nextEventId] = Event(
            _name,
            _price,
            _totalTickets,
            0,
            msg.sender
        );

        nextEventId++;
    }

    // -------------------
    // BUY TICKET
    // -------------------
    function buyTicket(uint _eventId) public payable {
        Event storage e = events[_eventId];

        require(msg.value == e.price, "Wrong price");
        require(e.sold < e.totalTickets, "Sold out");

        tickets[nextTicketId] = Ticket(
            _eventId,
            msg.sender,
            false
        );

        e.sold++;
        nextTicketId++;
    }

    // -------------------
    // USE TICKET
    // -------------------
    function useTicket(uint _ticketId) public {
        Ticket storage t = tickets[_ticketId];

        require(t.owner == msg.sender, "Not owner");
        require(!t.used, "Already used");

        t.used = true;
    }

    // -------------------
    // TRANSFER
    // -------------------
    function transferTicket(uint _ticketId, address _to) public {
        Ticket storage t = tickets[_ticketId];

        require(t.owner == msg.sender, "Not owner");
        require(!t.used, "Already used");

        t.owner = _to;
    }
}