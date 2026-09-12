import { PROTOCOL_VERSION } from "./games.js";
export const UNSUPPORTED_PROTOCOL = {
    code: "UNSUPPORTED_PROTOCOL",
    message: "This client does not support the room protocol version.",
    minimum: PROTOCOL_VERSION,
    maximum: PROTOCOL_VERSION,
};
