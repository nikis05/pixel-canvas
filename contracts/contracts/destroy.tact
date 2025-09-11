fun destroy(sender: Address) {
    message(MessageParameters {
        to: sender,
        value: 0,
        mode: SendRemainingBalance | SendDestroyIfZero,
        bounce: false,
    });
}
