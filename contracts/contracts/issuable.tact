import "./destroy.tact";

trait Issuable {
    abstract fun issuer(): Address;

    fun destroyIfWrongIssuer(): Bool {
        let sender: Address = sender();
        if (sender != self.issuer()) {
            destroy(sender);
            return true;
        }
        return false;
    }
}
