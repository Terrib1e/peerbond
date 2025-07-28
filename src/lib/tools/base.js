"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTool = void 0;
const zod_1 = require("zod");
class BaseTool {
    permissions;
    rateLimit;
    async execute(args, context) {
        try {
            // Validate arguments
            const validatedArgs = await this.schema.parseAsync(args);
            // Optional additional validation
            if (this.validate) {
                const isValid = await this.validate(validatedArgs, context);
                if (!isValid) {
                    return {
                        success: false,
                        error: 'Validation failed'
                    };
                }
            }
            // Execute the tool logic
            const result = await this.run(validatedArgs, context);
            return {
                success: true,
                data: result,
                metadata: {
                    executedAt: new Date().toISOString(),
                    executedBy: context.agentId
                }
            };
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return {
                    success: false,
                    error: `Invalid arguments: ${error.errors.map(e => e.message).join(', ')}`
                };
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
exports.BaseTool = BaseTool;
//# sourceMappingURL=base.js.map