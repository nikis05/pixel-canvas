contract Claim(sender: Address, _subject: String) {
    used: Bool = false;

    receive(msg: ClaimMessage) {
        let sender: Address = sender();
        if (sender != self.sender) {
            message(MessageParameters {
                to: sender,
                value: 0,
                mode: SendRemainingBalance | SendDestroyIfZero,
                bounce: false,
            });
        }
        require(!self.used, "This claim is already used");
        self.used = true;
        message(MessageParameters {
            to: msg.successCallbackAddress,
            value: 0,
            mode: SendRemainingBalance,
            bounce: false,
            body: msg.successCallbackData,
        });
    }
}

message ClaimMessage {
    successCallbackAddress: Address;
    successCallbackData: Cell;
}
