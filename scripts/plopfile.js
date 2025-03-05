import fs from "fs-extra";
import { camelCase } from "change-case";
import Handlebars from "handlebars";

const PRISMA_SCHEMA_PATH = "prisma/schema.prisma";

// Function to extract all models from schema.prisma
function getModels() {
    if (!fs.existsSync(PRISMA_SCHEMA_PATH)) {
        throw new Error(`Prisma schema file not found at ${PRISMA_SCHEMA_PATH}`);
    }

    const schema = fs.readFileSync(PRISMA_SCHEMA_PATH, "utf-8");
    const modelRegex = /model\s+(\w+)\s*{([\s\S]*?)}/g;
    const models = [];

    let match;
    while ((match = modelRegex.exec(schema)) !== null) {
        const modelName = match[1];
        const fields = match[2]
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("//"))
            .map((line) => {
                const parts = line.split(/\s+/);
                if (parts.length < 2) return null;

                const [name, typeRaw] = parts;
                const optional = typeRaw.endsWith("?");
                const type = typeRaw.replace("?", "");

                return { name, type, optional };
            })
            .filter(Boolean);

        models.push({ name: modelName, fields });
    }

    return models;
}

// Function to retrieve model fields
function getModelFields(modelName) {
    const models = getModels();
    const model = models.find((m) => m.name === modelName);

    if (!model) {
        throw new Error(`Model "${modelName}" not found in schema.prisma`);
    }

    return model.fields;
}

export default function (plop) {
    // Register the "startsWith" helper
    Handlebars.registerHelper("startsWith", function (str, prefix) {
        return str.startsWith(prefix);
    });

    // Register the "eq" helper (if not already registered)
    Handlebars.registerHelper("eq", function (a, b) {
        return a === b;
    });

    plop.setGenerator("form", {
        description: "Generate a form component based on a Prisma model",
        prompts: [
            {
                type: "list",
                name: "modelName",
                message: "Select the Prisma model to generate a form for:",
                choices: getModels().map((m) => m.name),
            },
        ],
        actions: (answers) => {
            if (!answers || !answers.modelName) {
                throw new Error("Model selection is required.");
            }

            const modelNameCamelCase = camelCase(answers.modelName);
            const fields = getModelFields(answers.modelName);

            return [
                {
                    type: "add",
                    path: `src/routes/${modelNameCamelCase}/add.tsx`,
                    templateFile: "plop-templates/form.tsx.hbs",
                    data: { fields },
                },
            ];
        },
    });
}