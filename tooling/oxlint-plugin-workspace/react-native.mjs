// React Native rules from rules/04-mobile-expo.md: text only inside <Text>, accessibility props on
// pressables / inputs / images, styling through token utilities (no inline styles, no colour
// literals, no font-weight utilities).

const PRESSABLE_ELEMENTS = new Set([
  "Pressable",
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "TouchableNativeFeedback",
]);
const LABELLED_ELEMENTS = new Set(["TextInput", "Image"]);
const ROLE_ATTRIBUTES = ["accessibilityRole", "role"];
const LABEL_ATTRIBUTES = ["accessibilityLabel", "aria-label"];

const COLOR_LITERAL = /^\s*(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(.*\))\s*$/i;
const FONT_WEIGHT_UTILITY =
  /(^|[\s:"'`])font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?=$|[\s"'`])/;

function elementName(nameNode) {
  if (nameNode.type === "JSXIdentifier") return nameNode.name;
  if (nameNode.type === "JSXMemberExpression") return nameNode.property.name;
  return "";
}

function attributes(openingElement) {
  return openingElement.attributes;
}

function hasSpread(openingElement) {
  return attributes(openingElement).some((attribute) => attribute.type === "JSXSpreadAttribute");
}

function hasAttribute(openingElement, names) {
  return attributes(openingElement).some(
    (attribute) => attribute.type === "JSXAttribute" && names.includes(attribute.name.name)
  );
}

function closestElement(node) {
  let current = node.parent;
  while (current && current.type !== "JSXElement") current = current.parent;
  return current;
}

function isInsideText(node, textComponents) {
  const element = closestElement(node);
  return element ? textComponents.has(elementName(element.openingElement.name)) : false;
}

function isStaticString(node) {
  return (node.type === "Literal" && typeof node.value === "string") || node.type === "TemplateLiteral";
}

const DEFAULT_TEXT_COMPONENTS = ["Text"];

export const noRawText = {
  meta: {
    type: "problem",
    docs: { description: "Text must be rendered inside a text component (rules/04)." },
    schema: [
      {
        type: "object",
        properties: { textComponents: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const textComponents = new Set(context.options[0]?.textComponents ?? DEFAULT_TEXT_COMPONENTS);
    const report = (node) =>
      context.report({
        node,
        message: "Raw text outside a text component crashes on native (rules/04). Wrap it in <Text>.",
      });
    return {
      JSXText(node) {
        if (node.value.trim() === "" || isInsideText(node, textComponents)) return;
        report(node);
      },
      JSXExpressionContainer(node) {
        if (node.parent.type !== "JSXElement" || !isStaticString(node.expression)) return;
        if (isInsideText(node, textComponents)) return;
        report(node);
      },
    };
  },
};

export const accessibleElements = {
  meta: {
    type: "problem",
    docs: { description: "Pressables need a role and a label; TextInput and Image need a label (rules/04)." },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = elementName(node.name);
        const isPressable = PRESSABLE_ELEMENTS.has(name);
        if (!isPressable && !LABELLED_ELEMENTS.has(name)) return;
        if (hasSpread(node)) return;
        if (isPressable && !hasAttribute(node, ROLE_ATTRIBUTES)) {
          context.report({ node, message: `<${name}> needs \`accessibilityRole\` (rules/04).` });
        }
        if (!hasAttribute(node, LABEL_ATTRIBUTES)) {
          context.report({ node, message: `<${name}> needs \`accessibilityLabel\` (rules/04).` });
        }
      },
    };
  },
};

function containsObjectLiteral(expression) {
  if (expression.type === "ObjectExpression") return true;
  if (expression.type === "ArrayExpression") {
    return expression.elements.some((element) => element !== null && containsObjectLiteral(element));
  }
  if (expression.type === "LogicalExpression") {
    return containsObjectLiteral(expression.left) || containsObjectLiteral(expression.right);
  }
  if (expression.type === "ConditionalExpression") {
    return containsObjectLiteral(expression.consequent) || containsObjectLiteral(expression.alternate);
  }
  if (expression.type === "ArrowFunctionExpression" || expression.type === "FunctionExpression") {
    return expression.body.type !== "BlockStatement" && containsObjectLiteral(expression.body);
  }
  return false;
}

export const noInlineStyles = {
  meta: {
    type: "problem",
    docs: { description: "Style through className token utilities, not inline style objects (rules/04)." },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const name = node.name.name;
        if (name !== "style" && !(typeof name === "string" && name.endsWith("Style"))) return;
        if (node.value?.type !== "JSXExpressionContainer") return;
        if (!containsObjectLiteral(node.value.expression)) return;
        context.report({
          node,
          message:
            "Inline style objects are banned (rules/04). Use className utilities; animated values go through Reanimated's useAnimatedStyle.",
        });
      },
    };
  },
};

export const noColorLiterals = {
  meta: {
    type: "problem",
    docs: { description: "Colours come from theme tokens in global.css, never literals (rules/04, rules/07)." },
    schema: [],
  },
  create(context) {
    const report = (node) =>
      context.report({
        node,
        message:
          "Colour literals are banned (rules/04). Use a token utility (`bg-card`, `text-muted-foreground`, `accent-primary`).",
      });
    return {
      Literal(node) {
        if (typeof node.value === "string" && COLOR_LITERAL.test(node.value)) report(node);
      },
      TemplateElement(node) {
        if (COLOR_LITERAL.test(node.value.cooked ?? "")) report(node);
      },
    };
  },
};

export const noFontWeightUtilities = {
  meta: {
    type: "problem",
    docs: { description: "Each weight is its own font family on React Native (rules/04)." },
    schema: [],
  },
  create(context) {
    const check = (node, text) => {
      const match = FONT_WEIGHT_UTILITY.exec(text);
      if (!match) return;
      context.report({
        node,
        message: `\`font-${match[2]}\` does nothing with custom fonts (rules/04). Use a weight family utility (\`font-sans-semibold\`, \`font-heading-bold\`).`,
      });
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? "");
      },
    };
  },
};
