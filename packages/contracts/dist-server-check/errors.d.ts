export declare const UNSUPPORTED_PROTOCOL: {
    readonly code: "UNSUPPORTED_PROTOCOL";
    readonly message: "This client does not support the room protocol version.";
    readonly minimum: 2;
    readonly maximum: 2;
};
export type UnsupportedProtocolError = typeof UNSUPPORTED_PROTOCOL;
