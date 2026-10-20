#!/usr/bin/env python3
"""Build index.html / wrapper.html / wrapper-local.html from shell.html + app.js.

shell.html holds the page skeleton (no <script> tags of its own).
This script appends the CDN (or local, for wrapper-local.html) script tags
for Chart.js, jsPDF and html2canvas, then wraps app.js in a single <script>
block. wrapper.html/wrapper-local.html additionally wrap everything in a
full standalone <html><head>...<body>...document (for local Playwright
testing); index.html (published as the artifact) is the bare fragment with
no doctype/html/head/body of its own, per the Artifact tool's expectations.
"""
with open("shell.html", "r", encoding="utf-8") as f:
    shell = f.read()
with open("app.js", "r", encoding="utf-8") as f:
    app = f.read()

CDN_SCRIPTS = (
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js"></script>\n'
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n'
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>\n'
)
LOCAL_SCRIPTS = (
    '<script src="node_modules/chart.js/dist/chart.umd.js"></script>\n'
    '<script src="node_modules/jspdf/dist/jspdf.umd.min.js"></script>\n'
    '<script src="node_modules/html2canvas/dist/html2canvas.min.js"></script>\n'
)

def build(body_scripts):
    return shell.rstrip("\n") + "\n\n\n" + body_scripts + "<script>\n" + app + "\n</script>"

HTML_HEAD = (
    '<!doctype html><html><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>'
)
HTML_TAIL = "</body></html>"

index_html = build(CDN_SCRIPTS)
wrapper_html = HTML_HEAD + index_html + HTML_TAIL
wrapper_local_html = HTML_HEAD + build(LOCAL_SCRIPTS) + HTML_TAIL

with open("index.html", "w", encoding="utf-8") as f:
    f.write(index_html)
with open("wrapper.html", "w", encoding="utf-8") as f:
    f.write(wrapper_html)
with open("wrapper-local.html", "w", encoding="utf-8") as f:
    f.write(wrapper_local_html)

print("built index.html ({} bytes), wrapper.html ({} bytes), wrapper-local.html ({} bytes)".format(
    len(index_html), len(wrapper_html), len(wrapper_local_html)))
