#!/usr/bin/env bash
set -euo pipefail

if python3 -c 'import reportlab' >/dev/null 2>&1; then
  python_bin="python3"
elif [[ -x "${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" ]]; then
  python_bin="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
else
  echo "ReportLab is required. Install it into Python 3, then rerun this command." >&2
  exit 1
fi

exec "${python_bin}" scripts/build-tmua-foundations-pdf.py
