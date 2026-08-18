/**
 * Cross-field argument validation for the browser tools.
 *
 * `defineTool` validates the per-property schema, so these functions only
 * hand-check constraints the schema DSL cannot express: mutual exclusion,
 * required pairing, and positive-integer bounds.
 *
 * @module validators
 */
import type { ClickArgs, ExtractArgs, FindArgs, NavigateArgs, ScreenshotArgs, TabsArgs, TypeArgs, WaitArgs } from './scripts.ts';
/** `url` XOR `history`; `newTab` only makes sense with `url`. */
export declare function validateNavigateArgs(args: NavigateArgs): void;
/** `switch`/`close` need a target id. */
export declare function validateTabsArgs(args: TabsArgs): void;
/** Free-text query bounds; the AX filter itself lives in the Python. */
export declare function validateFindArgs(args: FindArgs): void;
/** `nodeId` XOR `x`+`y`; click count is a positive integer. */
export declare function validateClickArgs(args: ClickArgs): void;
/** Exactly one of `text`/`key`; `selector` pairs with `text` only. */
export declare function validateTypeArgs(args: TypeArgs): void;
/** Exactly one of `expression`/`selector`; `attr` is required with mode attr. */
export declare function validateExtractArgs(args: ExtractArgs): void;
/** Output path non-empty; `maxDim` bounded to the image downscale range. */
export declare function validateScreenshotArgs(args: ScreenshotArgs): void;
/** At least one wait condition; every timeout is a positive number. */
export declare function validateWaitArgs(args: WaitArgs): void;
//# sourceMappingURL=validators.d.ts.map