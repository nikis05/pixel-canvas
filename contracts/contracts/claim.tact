import "./issuable.tact";
import "./destroy";

contract Claim with Issuable {
    issuer: Address;
    subject: Int;
    used: Bool = false;

    init(issuer: Address, subject: Int) {
        self.issuer = issuer;
        self.subject = subject;
    }

    receive() {
        if (!self.used) {
            destroy(sender());
        }
    }

    receive(msg: ClaimMessage) {
        require(!self.used, "This claim is already used");
        if (self.destroyIfWrongIssuer()) {
            return;
        }
        self.used = true;
        message(MessageParameters {
            to: msg.successCallbackAddress,
            value: context().value - ton("0.01"),
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

message(0x5e6c4b4c) ClaimMessage {
    id: Int as uint224;
    successCallbackAddress: Address;
    successCallbackData: Cell;
}

message(0x6e0b880c) ClaimSuccess {
    subject: Int;
    data: Cell;
}
