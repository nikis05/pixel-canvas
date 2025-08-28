inline fun afterReserve(): Int {
    let msgValue: Int = context().value;
    let balanceBeforeMsg: Int = myBalance() - msgValue;
    let coinsNeeded: Int = max(ton("0.1") - balanceBeforeMsg, 0);
    let amount: Int = msgValue - coinsNeeded;
    return amount;
}

fun afterMessage(): Int {
    let context: Context = context();
    let msgValue: Int = context.value;
    return msgValue - context.gasConsumed() - context.readForwardFee() - ton("0.01");
}
