#!/usr/bin/env bash
set -euo pipefail

bundled_python="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"

if [[ -x "${bundled_python}" ]] && "${bundled_python}" -c 'import reportlab, pypdf' >/dev/null 2>&1; then
  python_bin="${bundled_python}"
elif python3 -c 'import reportlab, pypdf' >/dev/null 2>&1; then
  python_bin="python3"
else
  echo "ReportLab and pypdf are required. Install them into Python 3, then rerun this command." >&2
  exit 1
fi

exec "${python_bin}" scripts/build-review-notes-pdfs.py
