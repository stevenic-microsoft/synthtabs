# json-yaml

## purpose

Bidirectional JSON ↔ YAML conversion, syntax differences, gotchas, CLI tooling (jq/yq), and schema validation.

## rules

1. **Know which YAML spec you target.** YAML 1.1 (used by PyYAML, Ruby Psych < 4) and YAML 1.2 (used by Go yaml.v3, Rust serde_yaml, `yq`) differ in type resolution. Always confirm which spec your parser follows before relying on implicit typing.
2. **Treat JSON as valid YAML 1.2.** Every valid JSON document is valid YAML 1.2. Leverage this for incremental migration — rename `.json` to `.yaml` and start adding YAML features gradually.
3. **Quote ambiguous scalar values.** Strings that look like booleans (`yes`, `no`, `on`, `off`, `true`, `false`), nulls (`null`, `~`), numbers (`0o17`, `0x1F`), or timestamps (`2024-01-15`) must be quoted in YAML to prevent misinterpretation. When in doubt, quote it.
4. **Always quote the Norway problem.** The country code `NO` is parsed as boolean `false` in YAML 1.1. This is the canonical example of implicit typing gone wrong. Quote all ISO country codes, locale identifiers, and short abbreviations: `"NO"`, `"NA"`, `"ON"`.
5. **Use block scalars for multi-line strings.** Use literal block scalar (`|`) to preserve newlines exactly. Use folded block scalar (`>`) to join lines into a single paragraph. Append `-` to strip the trailing newline (`|-`, `>-`) or `+` to keep all trailing newlines (`|+`, `>+`).
6. **Use anchors and aliases to eliminate duplication.** Define with `&anchor` and reference with `*alias`. Use merge keys (`<<: *anchor`) to compose mappings. Never nest anchors more than 2 levels deep — it harms readability and some parsers handle deep nesting inconsistently.
7. **Never use tabs for YAML indentation.** YAML forbids tabs for indentation (spec §5.5). Configure your editor to insert spaces. Use `yamllint` with `indentation: {spaces: 2}` to enforce this.
8. **Validate with JSON Schema when structure matters.** Use JSON Schema for both JSON and YAML validation. Tools like `ajv` (JS), `check-jsonschema` (Python CLI), and `yq` can validate YAML against a JSON Schema. Define schemas for config files, CI pipelines, and API contracts.
9. **Use `jq` for JSON transformation, `yq` for YAML.** `jq` is the standard CLI for querying/transforming JSON. `yq` extends similar syntax to YAML. Always specify which `yq` you mean — there are two incompatible implementations (Mike Farah's Go version and Andrey Kislyuk's Python wrapper around `jq`).
10. **Prefer explicit type tags over implicit resolution.** When a value's type is critical, use YAML tags: `!!str 123` forces string, `!!int "456"` forces integer. This prevents parser-dependent surprises.
11. **Comments don't survive JSON round-trips.** JSON has no comment syntax. Converting YAML → JSON → YAML loses all comments. If comments are essential, keep a YAML source of truth and generate JSON as a build artifact.
12. **Preserve key ordering intentionally.** JSON object key order is not guaranteed by the spec (though most parsers preserve insertion order). YAML mapping key order is also implementation-dependent. If order matters, use a sequence of single-key mappings or document the expected order.

## patterns

### CLI conversion with yq (Mike Farah's Go version)

```bash
# YAML → JSON
yq -o=json eval '.' config.yaml > config.json

# JSON → YAML
yq -P eval '.' config.json > config.yaml

# Extract a nested value
yq eval '.database.host' config.yaml

# Update a value in-place
yq eval -i '.database.port = 5433' config.yaml

# Merge two YAML files (second overrides first)
yq eval-all 'select(fileIndex == 0) * select(fileIndex == 1)' base.yaml overrides.yaml
```

### CLI transformation with jq

```bash
# Pretty-print JSON
jq '.' data.json

# Extract and reshape
jq '{name: .user.name, emails: [.user.contacts[].email]}' data.json

# Filter array elements
jq '.items[] | select(.status == "active")' data.json

# Convert JSON array to newline-delimited JSON (NDJSON)
jq -c '.[]' array.json

# Build JSON from shell variables
jq -n --arg host "$HOST" --arg port "$PORT" \
  '{database: {host: $host, port: ($port | tonumber)}}'
```

### Multi-line strings in YAML

```yaml
# Literal block — preserves newlines exactly
script: |
  #!/bin/bash
  echo "line 1"
  echo "line 2"

# Folded block — joins lines into paragraph
description: >
  This is a long description that spans
  multiple lines but will be folded into
  a single paragraph with spaces.

# Literal block, strip trailing newline
query: |-
  SELECT *
  FROM users
  WHERE active = true

# Folded block, keep all trailing newlines
message: >+
  Hello world

```

### Anchors, aliases, and merge keys

```yaml
# Define reusable defaults
defaults: &defaults
  adapter: postgres
  host: localhost
  pool: 5

development:
  database: myapp_dev
  <<: *defaults

production:
  database: myapp_prod
  <<: *defaults
  pool: 25        # override the anchored value
  host: db.prod.internal

# Sequence alias
common_tags: &tags
  - app: myapp
  - env: production

resources:
  server:
    tags: *tags
```

## pitfalls

- **Norway problem and friends.** In YAML 1.1, these bare values are booleans: `yes`, `no`, `on`, `off`, `y`, `n`, `YES`, `NO`, `True`, `False`. The country code `NO`, the abbreviation `NA`, and the word `on` are all silently converted. Always quote when in doubt. YAML 1.2 only recognizes `true`/`false`.
- **Octal ambiguity between specs.** YAML 1.1 treats `0777` as octal (511 decimal). YAML 1.2 requires explicit `0o777` for octal. `010` means 8 in YAML 1.1 but the string `"010"` or integer 10 in YAML 1.2, depending on context. Know your spec.
- **Two incompatible `yq` implementations.** Mike Farah's `yq` (Go, installed via `brew install yq`) uses a custom expression language. Andrey Kislyuk's `yq` (Python, `pip install yq`) wraps `jq` and uses jq syntax. Commands are not interchangeable. Check which you have: `yq --version`.
- **YAML bombs (billion laughs attack).** Recursive anchor expansion can create exponential memory usage. Limit alias expansion depth in production parsers. In Python: `yaml.safe_load()` not `yaml.load()`. In Node.js: `yaml` package has `maxAliasCount` option.
- **Trailing whitespace in block scalars.** Invisible trailing spaces in literal blocks (`|`) are preserved and may cause subtle bugs in SQL queries, scripts, or templates. Run `yamllint` with `trailing-spaces: enable` to catch these.
- **Float precision loss in round-trips.** JSON and YAML both represent numbers as IEEE 754 doubles. Round-tripping `0.1 + 0.2` through serialization yields `0.30000000000000004`. If exact decimal precision matters, represent as strings and parse explicitly.
- **Duplicate keys are silently overwritten.** Both JSON (per RFC 7159 "SHOULD be unique") and YAML (spec says last wins) allow duplicate keys without error in most parsers. Use `yamllint` with `key-duplicates: enable` and a JSON linter to catch these.

## references

- YAML 1.2 specification: https://yaml.org/spec/1.2.2/
- JSON specification (RFC 8259): https://datatracker.ietf.org/doc/html/rfc8259
- jq manual: https://jqlang.github.io/jq/manual/
- yq (Mike Farah): https://mikefarah.gitbook.io/yq/
- yamllint documentation: https://yamllint.readthedocs.io/
- JSON Schema: https://json-schema.org/
- YAML multiline guide: https://yaml-multiline.info/

## instructions

Use this expert for any question about JSON or YAML syntax, conversion between the two formats, CLI tooling (jq, yq), schema validation, or data serialization gotchas.

**Trigger phrases:** "convert JSON to YAML," "YAML syntax," "jq query," "yq command," "JSON Schema," "YAML anchors," "block scalar," "Norway problem."

Pair with: any language expert from `../languages/` for programmatic parsing and serialization (e.g., Python's `yaml.safe_load()`, Node.js `js-yaml`, Go `yaml.v3`).

## research

Deep Research prompt:

"Write a micro-expert for bidirectional JSON ↔ YAML conversion and tooling. Cover: YAML 1.1 vs 1.2 spec differences (implicit typing, boolean resolution, octal notation), the Norway problem and related type-coercion pitfalls, block scalar syntax (literal vs folded, chomp indicators), anchors/aliases/merge keys, CLI tooling (jq query syntax, yq variants — Mike Farah Go vs Andrey Kislyuk Python), JSON Schema validation for both formats, yamllint configuration, comment preservation across formats, key ordering semantics, and security concerns (YAML bombs, safe_load). Include conversion patterns for CLI workflows and multi-line string handling."
