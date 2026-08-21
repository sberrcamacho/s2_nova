// COP (this app's storage currency) has no subunit, so amount_minor IS the
// peso value — no /100 conversion needed anywhere. Fastify's default JSON
// serializer can't handle BigInt, so teach it to serialize as a plain
// number; every amount in this app is comfortably under Number's safe
// integer range (2^53), so this loses no precision. Imported once, for
// its side effect, before anything serializes a response.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this);
};
