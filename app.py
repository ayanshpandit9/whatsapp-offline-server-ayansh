from flask import Flask, render_template, request
import subprocess

app = Flask(__name__)
pair_code = None

@app.route("/", methods=["GET", "POST"])
def index():
    global pair_code
    if request.method == "POST":
        subprocess.Popen(["node", "bot.js"])
        pair_code = "QR code is being generated in logs... Scan within 1 minute"
    return render_template("index.html", pair_code=pair_code)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
