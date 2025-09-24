export default function unreachable(_value: never): never {
  throw new Error("Entered unreachable code");
}
