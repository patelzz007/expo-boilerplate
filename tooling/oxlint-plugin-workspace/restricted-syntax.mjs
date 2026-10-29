// The non-negotiable syntax bans (rules/00-non-negotiables.md, rules/27-array-index-readability.md,
// rules/28-runtime-validation.md). Applied to every TypeScript file.

const ZOD_BANNED_FACTORIES = new Set(["any", "unknown", "never"]);

/** `catch (error: unknown)` */
function isCatchClauseParam(typeNode) {
  const annotation = typeNode.parent;
  const param = annotation?.parent;
  return (
    annotation?.type === "TSTypeAnnotation" && param?.parent?.type === "CatchClause" && param.parent.param === param
  );
}

/** `.catch((error: unknown) => …)` — the first parameter of a `.catch` callback */
function isPromiseCatchCallbackParam(typeNode) {
  const annotation = typeNode.parent;
  const param = annotation?.parent;
  const fn = param?.parent;
  if (annotation?.type !== "TSTypeAnnotation" || !fn) return false;
  if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") return false;
  if (fn.params[0] !== param) return false;
  const call = fn.parent;
  return (
    call?.type === "CallExpression" &&
    call.callee.type === "MemberExpression" &&
    !call.callee.computed &&
    call.callee.property.name === "catch"
  );
}

/** `function assertNever…(value: never): never` */
function isAssertNeverSignature(typeNode) {
  let current = typeNode.parent;
  while (current) {
    if (current.type === "FunctionDeclaration") {
      return current.id?.name.startsWith("assertNever") === true;
    }
    if (current.type !== "TSTypeAnnotation" && current.type !== "Identifier") return false;
    current = current.parent;
  }
  return false;
}

/**
 * `Record<Exclude<keyof X, keyof Y>, never>` — the key guard zod's `.pick()` requires. Provisional
 * exemption, pending a human decision (rules/00, "How this gets caught in CI"): do not add new uses.
 */
function isPickKeyGuard(typeNode) {
  const params = typeNode.parent;
  const reference = params?.parent;
  if (params?.type !== "TSTypeParameterInstantiation" || reference?.type !== "TSTypeReference") return false;
  if (reference.typeName.type !== "Identifier" || reference.typeName.name !== "Record") return false;
  const [keys, value] = params.params;
  return (
    value === typeNode &&
    keys?.type === "TSTypeReference" &&
    keys.typeName.type === "Identifier" &&
    keys.typeName.name === "Exclude"
  );
}

function isNumericLiteral(node) {
  return node.type === "Literal" && typeof node.value === "number";
}

function isMemberNamed(node, objectName, propertyName) {
  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    node.object.name === objectName &&
    node.property.name === propertyName
  );
}

export const restrictedSyntax = {
  meta: {
    type: "problem",
    docs: { description: "Bans the constructs listed in rules/00, rules/27 and rules/28." },
    schema: [],
  },
  create(context) {
    return {
      TSUnknownKeyword(node) {
        if (isCatchClauseParam(node) || isPromiseCatchCallbackParam(node)) return;
        context.report({
          node,
          message:
            "`unknown` is banned (rules/00). Parse with a zod schema at the boundary and use `z.infer<>` inward. Allowed only on a `catch` clause / `.catch()` callback error parameter.",
        });
      },
      TSNeverKeyword(node) {
        if (isAssertNeverSignature(node) || isPickKeyGuard(node)) return;
        context.report({
          node,
          message: "`never` is banned outside an `assertNever(value: never): never` exhaustiveness helper (rules/00).",
        });
      },
      TSAsExpression(node) {
        context.report({
          node,
          message:
            "Type casts (`as`, `as const`) are banned (rules/00). Validate with zod, annotate a tuple type, or use `satisfies`.",
        });
      },
      TSTypeAssertion(node) {
        context.report({ node, message: "`<T>value` casts are banned (rules/00)." });
      },
      UnaryExpression(node) {
        if (node.operator !== "typeof") return;
        context.report({
          node,
          message:
            "The runtime `typeof` operator is banned (rules/28). Use zod at the boundary, or narrow a typed union structurally.",
        });
      },
      CallExpression(node) {
        const { callee } = node;
        if (isMemberNamed(callee, "Array", "isArray")) {
          context.report({
            node,
            message: "`Array.isArray` is banned (rules/28). Use `z.array(...)` at the boundary.",
          });
          return;
        }
        if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.property.name === "call" &&
          callee.object.type === "MemberExpression" &&
          !callee.object.computed &&
          callee.object.property.name === "toString" &&
          isMemberNamed(callee.object.object, "Object", "prototype")
        ) {
          context.report({ node, message: "`Object.prototype.toString.call` tag sniffing is banned (rules/28)." });
          return;
        }
        if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.object.type === "Identifier" &&
          callee.object.name === "z" &&
          ZOD_BANNED_FACTORIES.has(callee.property.name)
        ) {
          context.report({
            node,
            message: `\`z.${callee.property.name}()\` is banned (rules/00). Describe the real shape.`,
          });
        }
      },
      MemberExpression(node) {
        if (!node.computed || !isNumericLiteral(node.property)) return;
        context.report({
          node,
          message:
            "Numeric-literal index access is banned (rules/27). Destructure, use named RegExp groups, or a literal-typed index map.",
        });
      },
    };
  },
};
