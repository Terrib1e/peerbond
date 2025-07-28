"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
class ToolRegistry {
    static tools = new Map();
    static middlewares = [];
    static authorizations = new Map();
    static register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool ${tool.name} is already registered`);
        }
        this.tools.set(tool.name, tool);
    }
    static unregister(name) {
        this.tools.delete(name);
    }
    static get(name) {
        return this.tools.get(name);
    }
    static getAll() {
        return Array.from(this.tools.values());
    }
    static addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }
    static setAuthorization(toolName, authorizations) {
        this.authorizations.set(toolName, authorizations);
    }
    static async execute(toolName, args, context) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            return {
                success: false,
                error: `Tool ${toolName} not found`
            };
        }
        // Check authorization
        const isAuthorized = await this.checkAuthorization(tool, context);
        if (!isAuthorized) {
            return {
                success: false,
                error: 'Unauthorized to use this tool'
            };
        }
        // Build middleware chain
        const executeChain = this.middlewares.reduceRight((next, middleware) => async () => middleware(tool, args, context, next), async () => tool.execute(args, context));
        return executeChain();
    }
    static async checkAuthorization(tool, context) {
        const authorizations = this.authorizations.get(tool.name);
        if (!authorizations || authorizations.length === 0) {
            // No specific authorization required
            return true;
        }
        // Check if any authorization matches
        for (const auth of authorizations) {
            if (auth.principal === context.agentId || auth.principal === '*') {
                // Check additional conditions
                if (auth.conditions) {
                    const now = new Date();
                    // Time window check
                    if (auth.conditions.timeWindow) {
                        const [start, end] = auth.conditions.timeWindow;
                        if (now < start || now > end) {
                            continue;
                        }
                    }
                    // Add more condition checks as needed
                }
                return true;
            }
        }
        return false;
    }
    static getToolDefinitions() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: this.zodSchemaToJsonSchema(tool.schema)
        }));
    }
    static zodSchemaToJsonSchema(schema) {
        // This is a simplified conversion - in production, use a proper library
        // like zod-to-json-schema
        const shape = schema._def?.shape?.() || {};
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            const zodType = value;
            properties[key] = {
                type: this.getJsonType(zodType),
                description: zodType._def?.description
            };
            if (!zodType.isOptional()) {
                required.push(key);
            }
        }
        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined
        };
    }
    static getJsonType(zodType) {
        const typeName = zodType._def?.typeName;
        switch (typeName) {
            case 'ZodString':
                return 'string';
            case 'ZodNumber':
                return 'number';
            case 'ZodBoolean':
                return 'boolean';
            case 'ZodArray':
                return 'array';
            case 'ZodObject':
                return 'object';
            default:
                return 'string';
        }
    }
    static clear() {
        this.tools.clear();
        this.middlewares = [];
        this.authorizations.clear();
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=registry.js.map