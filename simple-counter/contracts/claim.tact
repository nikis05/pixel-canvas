import "./issuable.tact";

contract Claim with Issuable {
    issuer: Address;
    subject: Int;
    used: Bool = false;

    init(issuer: Address, subject: Int) {
        self.issuer = issuer;
        self.subject = subject;
    }

    receive(msg: ClaimMessage) {
        require(!self.used, "This claim is already used");
        if (self.destroyIfWrongIssuer()) {
            return;
        }
        self.used = true;
        message(MessageParameters {
            to: msg.successCallbackAddress,
            value: 0,
            mode: SendRemainingBalance,
            bounce: false,
            body: ClaimSuccess {
                subject: self.subject,
                data: msg.successCallbackData,
            }.toCell(),
        });
    }

    override inline fun issuer(): Address {
        return self.issuer;
    }
}

message ClaimMessage {
    id: Int as uint224;
    successCallbackAddress: Address;
    successCallbackData: Cell;
}

message ClaimSuccess {
    subject: Int;
    data: Cell;
}
