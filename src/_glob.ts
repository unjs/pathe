/*
Minimal glob matcher ported from zeptomatch.

Only the logic needed by `matchesGlob` is included: globs are compiled to a single
`RegExp` (the `partial` option is never used, which collapses the original
graph-to-regex compiler down to a plain recursive walk).

Based on zeptomatch (and its `grammex` / `graphmatch` dependencies):
 - https://github.com/fabiospampinato/zeptomatch

The MIT License (MIT)
Copyright (c) 2023-present Fabio Spampinato

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

// --- Minimal parser combinators (subset of `grammex`) ---

interface State {
  input: string;
  index: number;
  output: any[];
}

type Rule = (state: State) => boolean;

type Handler = ((...args: any[]) => any) | string | undefined;

const _CAPTURING_RE = /\\\(|\((?!\?(?::|=|!|<=|<!))/;

const _apply = (state: State, start: number, handler: (outputs: any[]) => any): void => {
  const output = handler(state.output.splice(start));
  if (output !== undefined) {
    state.output.push(output);
  }
};

const match = (target: string | RegExp, handler?: Handler): Rule => {
  if (typeof target === "string") {
    return (state) => {
      if (!state.input.startsWith(target, state.index)) {
        return false;
      }
      if (handler !== undefined) {
        const output = typeof handler === "function" ? handler(target) : handler;
        if (output !== undefined) {
          state.output.push(output);
        }
      }
      state.index += target.length;
      return true;
    };
  }
  const re = new RegExp(
    target.source,
    target.flags.includes("y") ? target.flags : `${target.flags}y`,
  );
  const capturing =
    _CAPTURING_RE.test(target.source) && typeof handler === "function" && handler.length >= 2;
  return (state) => {
    re.lastIndex = state.index;
    const matched = re.exec(state.input);
    if (!matched) {
      return false;
    }
    // Capture the end index before running the handler: a handler may re-enter
    // the parser (e.g. negation compiling a nested glob) and clobber `lastIndex`.
    const indexEnd = re.lastIndex;
    if (handler !== undefined) {
      const output =
        typeof handler !== "function"
          ? handler
          : capturing
            ? handler(...matched)
            : handler(matched[0]);
      if (output !== undefined) {
        state.output.push(output);
      }
    }
    state.index = indexEnd;
    return true;
  };
};

const and = (rules: Rule[], handler?: (outputs: any[]) => any): Rule => {
  return (state) => {
    const index = state.index;
    const length = state.output.length;
    for (const rule of rules) {
      if (!rule(state)) {
        state.index = index;
        state.output.length = length;
        return false;
      }
    }
    if (handler) {
      _apply(state, length, handler);
    }
    return true;
  };
};

const or = (rules: Rule[], handler?: (outputs: any[]) => any): Rule => {
  return (state) => {
    const length = state.output.length;
    for (const rule of rules) {
      if (rule(state)) {
        if (handler) {
          _apply(state, length, handler);
        }
        return true;
      }
    }
    return false;
  };
};

const repeat = (rule: Rule, min: number, max: number, handler?: (outputs: any[]) => any): Rule => {
  return (state) => {
    const length = state.output.length;
    let repetitions = 0;
    while (repetitions < max) {
      const index = state.index;
      if (!rule(state)) {
        break;
      }
      repetitions += 1;
      if (state.index === index) {
        break;
      }
    }
    if (repetitions < min) {
      return false;
    }
    if (handler) {
      _apply(state, length, handler);
    }
    return true;
  };
};

const optional = (rule: Rule, handler?: (outputs: any[]) => any): Rule =>
  repeat(rule, 0, 1, handler);
const star = (rule: Rule, handler?: (outputs: any[]) => any): Rule =>
  repeat(rule, 0, Infinity, handler);
const plus = (rule: Rule, handler?: (outputs: any[]) => any): Rule =>
  repeat(rule, 1, Infinity, handler);

const lazy = (getter: () => Rule): Rule => {
  let rule: Rule | undefined;
  return (state) => (rule ??= getter())(state);
};

const parse = (input: string, rule: Rule): any[] => {
  const state: State = { input, index: 0, output: [] };
  if (rule(state) && state.index === input.length) {
    return state.output;
  }
  throw new Error(`Failed to parse at index ${state.index}`);
};

// --- Node graph ---

interface Node {
  regex?: RegExp;
  children: Node[];
}

const regex = (source: string): Node => ({ regex: new RegExp(source, "s"), children: [] });
const slash = (): Node => ({ regex: new RegExp("[\\\\/]", "s"), children: [] });
const alternation = (children: Node[]): Node => ({ children });

const _pushToLeaves = (parent: Node, child: Node, handled: Set<Node>): void => {
  if (handled.has(parent)) {
    return;
  }
  handled.add(parent);
  const { children } = parent;
  if (children.length === 0) {
    children.push(child);
  } else {
    for (const node of children) {
      _pushToLeaves(node, child, handled);
    }
  }
};

const sequence = (nodes: Node[]): Node => {
  if (nodes.length === 0) {
    return alternation([]);
  }
  for (let i = nodes.length - 1; i >= 1; i--) {
    _pushToLeaves(nodes[i - 1]!, nodes[i]!, new Set());
  }
  return nodes[0]!;
};

const getNodes = (root: Node): Node[] => {
  const nodes = new Set<Node>();
  const queue: Node[] = [root];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i]!;
    if (nodes.has(node)) {
      continue;
    }
    nodes.add(node);
    for (const child of node.children) {
      queue.push(child);
    }
  }
  return [...nodes];
};

const nodeSourceCached = (node: Node, cache: Map<Node, string>): string => {
  const cached = cache.get(node);
  if (cached !== undefined) {
    return cached;
  }
  let source = node.regex ? node.regex.source : "";
  if (node.children.length > 0) {
    const seen = new Set<string>();
    for (const child of node.children) {
      const childSource = nodeSourceCached(child, cache);
      if (childSource) {
        seen.add(childSource);
      }
    }
    if (seen.size > 0) {
      const children = [...seen];
      source += children.length > 1 ? `(?:${children.join("|")})` : children[0];
    }
  }
  cache.set(node, source);
  return source;
};

// Compute sources leaf-to-root (BFS order reversed) so every child is already
// cached when its parent is visited: recursion never nests deeper than one level,
// which keeps pathological globs (e.g. thousands of escapes) from overflowing.
const nodeSource = (root: Node): string => {
  const cache = new Map<Node, string>();
  const nodes = getNodes(root);
  for (let i = nodes.length - 1; i >= 0; i--) {
    nodeSourceCached(nodes[i]!, cache);
  }
  return cache.get(root) ?? "";
};

// --- Range expansion (`{1..3}`, `{a..c}`) ---

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

const int2alpha = (int: number): string => {
  let alpha = "";
  while (int > 0) {
    alpha = ALPHABET[(int - 1) % 26] + alpha;
    int = Math.floor((int - 1) / 26);
  }
  return alpha;
};

const alpha2int = (str: string): number => {
  let int = 0;
  for (const char of str) {
    int = int * 26 + ALPHABET.indexOf(char) + 1;
  }
  return int;
};

const makeRangeInt = (start: number, end: number): number[] => {
  if (end < start) {
    return makeRangeInt(end, start);
  }
  const range: number[] = [];
  while (start <= end) {
    range.push(start++);
  }
  return range;
};

const makeRangePaddedInt = (start: number, end: number, paddingLength: number): string[] =>
  makeRangeInt(start, end).map((int) => String(int).padStart(paddingLength, "0"));

const makeRangeAlpha = (start: string, end: string): string[] =>
  makeRangeInt(alpha2int(start), alpha2int(end)).map(int2alpha);

// --- Normalize grammar (collapses redundant `**`) ---

const identity = <T>(value: T): T => value;

const NormalizeGrammar = /* @__PURE__ */ star(
  /* @__PURE__ */ or([
    /* @__PURE__ */ match(/\\./, identity),
    /* @__PURE__ */ match(/\*\*\*+/, "*"),
    /* @__PURE__ */ match(/([^/{[(!])\*\*/, (_: string, $1: string) => `${$1}*`),
    /* @__PURE__ */ match(/(^|.)\*\*(?=[^*/)\]}])/, (_: string, $1: string) => `${$1}*`),
    /* @__PURE__ */ match(/./, identity),
  ]),
);

const normalizeGlob = (glob: string): string => parse(glob, NormalizeGrammar).join("");

// --- Parse grammar (glob -> node graph) ---

const Escaped = /* @__PURE__ */ match(/\\./, regex);
const Escape = /* @__PURE__ */ match(/[$.*+?^(){}[\]|]/, (char: string) => regex(`\\${char}`));
const Slash = /* @__PURE__ */ match(/[\\/]/, slash);
const Passthrough = /* @__PURE__ */ match(/[^$.*+?^(){}[\]|\\/]+/, regex);

const NegationOdd = /* @__PURE__ */ match(/^(?:!!)*!(.*)$/, (_: string, glob: string) =>
  regex(`(?!^${compileGlob(glob).source}$).*?`),
);
const NegationEven = /* @__PURE__ */ match(/^(!!)+/);
const Negation = /* @__PURE__ */ or([NegationOdd, NegationEven]);

const StarStarBetween = /* @__PURE__ */ match(/\/(\*\*\/)+/, () =>
  alternation([sequence([slash(), regex(".+?"), slash()]), slash()]),
);
const StarStarStart = /* @__PURE__ */ match(/^(\*\*\/)+/, () =>
  alternation([regex("^"), sequence([regex(".*?"), slash()])]),
);
const StarStarEnd = /* @__PURE__ */ match(/\/(\*\*)$/, () =>
  alternation([sequence([slash(), regex(".*?")]), regex("$")]),
);
const StarStarNone = /* @__PURE__ */ match(/\*\*/, () => regex(".*?"));
const StarStar = /* @__PURE__ */ or([StarStarBetween, StarStarStart, StarStarEnd, StarStarNone]);

const StarDouble = /* @__PURE__ */ match(/\*\/(?!\*\*\/|\*$)/, () =>
  sequence([regex("[^\\\\/]*?"), slash()]),
);
const StarSingle = /* @__PURE__ */ match(/\*/, () => regex("[^\\\\/]*"));
const Star = /* @__PURE__ */ or([StarDouble, StarSingle]);

const Question = /* @__PURE__ */ match("?", () => regex("[^\\\\/]"));

const ClassOpen = /* @__PURE__ */ match("[", identity);
const ClassClose = /* @__PURE__ */ match("]", identity);
const ClassNegation = /* @__PURE__ */ match(/[!^]/, "^\\\\/");
const ClassRange = /* @__PURE__ */ match(/[a-z]-[a-z]|[0-9]-[0-9]/i, identity);
const ClassEscaped = /* @__PURE__ */ match(/\\./, identity);
const ClassEscape = /* @__PURE__ */ match(/[$.*+?^(){}[|]/, (char: string) => `\\${char}`);
const ClassSlash = /* @__PURE__ */ match(/[\\/]/, "\\\\/");
const ClassPassthrough = /* @__PURE__ */ match(/[^$.*+?^(){}[\]|\\/]+/, identity);
const ClassValue = /* @__PURE__ */ or([
  ClassEscaped,
  ClassEscape,
  ClassSlash,
  ClassRange,
  ClassPassthrough,
]);
const Class = /* @__PURE__ */ and(
  [
    ClassOpen,
    /* @__PURE__ */ optional(ClassNegation),
    /* @__PURE__ */ star(ClassValue),
    ClassClose,
  ],
  (_) => regex(_.join("")),
);

const RangeOpen = /* @__PURE__ */ match("{", "(?:");
const RangeClose = /* @__PURE__ */ match("}", ")");
const RangeNumeric = /* @__PURE__ */ match(/(\d+)\.\.(\d+)/, (_: string, $1: string, $2: string) =>
  makeRangePaddedInt(+$1, +$2, Math.min($1.length, $2.length)).join("|"),
);
const RangeAlphaLower = /* @__PURE__ */ match(
  /([a-z]+)\.\.([a-z]+)/,
  (_: string, $1: string, $2: string) => makeRangeAlpha($1, $2).join("|"),
);
const RangeAlphaUpper = /* @__PURE__ */ match(
  /([A-Z]+)\.\.([A-Z]+)/,
  (_: string, $1: string, $2: string) =>
    makeRangeAlpha($1.toLowerCase(), $2.toLowerCase()).join("|").toUpperCase(),
);
const RangeValue = /* @__PURE__ */ or([RangeNumeric, RangeAlphaLower, RangeAlphaUpper]);
const Range = /* @__PURE__ */ and([RangeOpen, RangeValue, RangeClose], (_) => regex(_.join("")));

const BracesOpen = /* @__PURE__ */ match("{");
const BracesClose = /* @__PURE__ */ match("}");
const BracesComma = /* @__PURE__ */ match(",");
const BracesEscaped = /* @__PURE__ */ match(/\\./, regex);
const BracesEscape = /* @__PURE__ */ match(/[$.*+?^(){[\]|]/, (char: string) => regex(`\\${char}`));
const BracesSlash = /* @__PURE__ */ match(/[\\/]/, slash);
const BracesPassthrough = /* @__PURE__ */ match(/[^$.*+?^(){}[\]|\\/,]+/, regex);
const BracesNested = /* @__PURE__ */ lazy(() => Braces);
const BracesEmptyValue = /* @__PURE__ */ match("", () => regex("(?:)"));
const BracesFullValue = /* @__PURE__ */ plus(
  /* @__PURE__ */ or([
    StarStar,
    Star,
    Question,
    Class,
    Range,
    BracesNested,
    BracesEscaped,
    BracesEscape,
    BracesSlash,
    BracesPassthrough,
  ]),
  sequence,
);
const BracesValue = /* @__PURE__ */ or([BracesFullValue, BracesEmptyValue]);
const Braces: Rule = /* @__PURE__ */ and(
  [
    BracesOpen,
    /* @__PURE__ */ optional(
      /* @__PURE__ */ and([
        BracesValue,
        /* @__PURE__ */ star(/* @__PURE__ */ and([BracesComma, BracesValue])),
      ]),
    ),
    BracesClose,
  ],
  alternation,
);

const Grammar = /* @__PURE__ */ star(
  /* @__PURE__ */ or([
    Negation,
    StarStar,
    Star,
    Question,
    Class,
    Range,
    Braces,
    Escaped,
    Escape,
    Slash,
    Passthrough,
  ]),
  sequence,
);

// --- Compilation ---

const _cache = /* @__PURE__ */ new Map<string, RegExp>();

function compileGlob(glob: string): RegExp {
  let re = _cache.get(glob);
  if (re === undefined) {
    const node: Node = parse(normalizeGlob(glob), Grammar)[0];
    const source = nodeSource(node);
    re = new RegExp(`^(?:${source})[\\\\/]?$`, "s");
    _cache.set(glob, re);
  }
  return re;
}

const compileGlobs = (globs: string[]): RegExp => {
  const source = globs.map((glob) => compileGlob(glob).source).join("|") || "$^";
  return new RegExp(source, "s");
};

/**
 * Compile a glob (or list of globs) to a `RegExp` and test it against `path`.
 */
export const matchGlob = (glob: string | string[], path: string): boolean => {
  const re = typeof glob === "string" ? compileGlob(glob) : compileGlobs(glob);
  return re.test(path);
};
